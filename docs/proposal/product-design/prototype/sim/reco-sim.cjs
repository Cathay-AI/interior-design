// Offline simulation of the viewing-stage recommender: old method vs new, with ablations.
// Run: node docs/proposal/product-design/prototype/sim/reco-sim.cjs [users per cell, default 200]
// Pure Node, single process, no browser. Mirrors the logic in prototype.js (functions are re-stated here because
// prototype.js needs a DOM); if those change, change these too.
global.window = {};
console.assert = () => {};
require('../catalog.js');
require('../reco.js');
const C = window.HB_CATALOG, R = window.HB_RECO;
const { LOOKS, PARTS, PART, FURN, STYLES, CLASH, lookX } = C;
const USERS = +process.argv[2] || 200;

// ---------- helpers mirrored from prototype.js ----------
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const gauss = r => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
const sig = z => 1 / (1 + Math.exp(-z));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const SLOTS = ['table', 'chair', 'side', 'plant', 'accent', 'screen'];
const furnOf = lk => ({ ...(STYLES[lk.style].furn || {}), ...(lk.furn || {}) });
const itemsOf = lk => { const f = furnOf(lk); return [...PARTS.map(p => p.list[lk[p.k]]), ...SLOTS.map(k => f[k] && FURN[f[k]]).filter(Boolean)]; };
const candLook = (i, mod) => { if (!mod) return LOOKS[i]; const lk = { ...LOOKS[i] }; for (const [k, v] of Object.entries(mod)) if (PART[k]) lk[k] = v; else lk.furn = { ...(lk.furn || {}), [k]: v }; return lk; };
const optionX = o => { const xs = o.s.map(n => STYLES[n].x); return [0, 1, 2].map(i => xs.reduce((t, x) => t + x[i], 0) / xs.length); };
const clashes = lk => CLASH.filter(([a, an, b, bn]) => PART[a].list[lk[a]].n === an && PART[b].list[lk[b]].n === bn);
function observe(E, d, y, w = 1) {
  const p = sig(dot(E.mu, d)), k = p * (1 - p), s = d.reduce((a, di, i) => a + E.v[i] * di * di, 0);
  for (let i = 0; i < 3; i++) { E.mu[i] += w * E.v[i] * d[i] * (y - p) / (1 + k * s); E.v[i] = Math.max(.06, E.v[i] - w * E.v[i] * E.v[i] * d[i] * d[i] * k / (1 + k * s)); }
  E.n++;
}
const style = i => LOOKS[i].style;
const POOL = LOOKS.map(lookX), LFEAT = LOOKS.map(lk => R.feat(itemsOf(lk)));

// ---------- candidate set for the final recommendation: every look and every single-piece swap ----------
const CANDS = [];
LOOKS.forEach((lk, i) => {
  CANDS.push({ i, mod: null });
  for (const k of ['sofa', 'lamp', 'rug', 'curtain', 'wall', 'floor']) PART[k].list.forEach((o, v) => { if (v !== lk[k] && o.s.includes(lk.style) && !clashes({ ...lk, [k]: v }).length) CANDS.push({ i, mod: { [k]: v } }); });
  const f = furnOf(lk);
  for (const k of SLOTS) if (f[k]) Object.values(FURN).forEach(it => { if (it.slot === k && it.k !== f[k] && it.s.includes(lk.style)) CANDS.push({ i, mod: { [k]: it.k } }); });
});
CANDS.forEach(c => { const lk = candLook(c.i, c.mod); c.x = lookX(lk); c.f = R.feat(itemsOf(lk)); });

// ---------- simulated people ----------
// True utility: three taste dimensions plus a hidden weight on every tag. Choices are softmax with temperature `temp`.
// Feedback: names the piece of the chosen room it likes least, if that piece is clearly disliked.
function makeUser(seed, temp) {
  const r = rng(seed), u = [0, 1, 2].map(() => gauss(r) * .8), w = R.TAGS.map(() => gauss(r));
  const util = (x, f) => dot(u, x) + dot(w, f) / 2;
  const choose = utils => { const m = Math.max(...utils), e = utils.map(x => Math.exp((x - m) / temp)), s = e.reduce((a, b) => a + b, 0); let t = r() * s; for (let k = 0; k < e.length; k++) { t -= e[k]; if (t <= 0) return k; } return e.length - 1; };
  const pieceU = it => it.tags.reduce((a, t) => a + w[R.IDX[t]], 0) / 2 + gauss(r) * temp * .5;
  return { util, choose, pieceU, r };
}

// ---------- the two recommenders ----------
// OLD (commit 02931fd): pairs, dimension-only pair selection, additive clamped tag weights, greedy single swap.
// NEW (commit 81facfb): four rooms per round, champion + feedback, Bayesian tags, Thompson + information bonus.
function run(cfg, user, seed) {
  const E = { mu: [0, 0, 0], v: [1.5, 1.5, 1.5], n: 0 }, P = R.fresh(), tagW = {}, used = [], hist = [];
  const r = rng(seed * 7 + 3);
  const Wvec = () => cfg.bayes ? P.mu : R.TAGS.map(t => tagW[t] || 0);
  const learnOld = (items, wt) => { const per = wt * 1.5 / items.length; items.forEach(it => it.tags.forEach(t => { tagW[t] = clamp((tagW[t] || 0) + per, -3, 3); })); };
  const pieceScore = it => (cfg.bayes ? R.meanOf(P, it) : it.tags.reduce((a, t) => a + (tagW[t] || 0), 0)) + .5 * dot(E.mu, optionX(it));
  function tune(i, base, only) {
    if (E.n < 1 && !only) return null;
    const lk = candLook(i, base), f = furnOf(lk), recent = only ? [] : hist.slice(-2);
    const W = cfg.thompson ? R.sample(P, rng(7919 + E.n * 131 + i * 17 + seed)) : null; let best = null;
    const consider = (k, cur, alts) => alts.forEach(([v, it]) => {
      const gain = W ? R.sampledOf(W, it) - R.sampledOf(W, cur) + .5 * (dot(E.mu, optionX(it)) - dot(E.mu, optionX(cur))) : pieceScore(it) - pieceScore(cur);
      const info = cfg.bayes ? R.infoOf(P, cur, it) : 0, score = gain + cfg.infoBonus * info;
      if ((only || gain > (cfg.bayes ? 0 : .15)) && (!best || score > best.score)) best = { k, v, score };
    });
    for (const k of ['sofa', 'lamp', 'rug', 'curtain', 'wall', 'floor']) { if (recent.includes(k) || (only && only !== k)) continue; consider(k, PART[k].list[lk[k]], PART[k].list.map((o, v) => [v, o]).filter(([v, o]) => v !== lk[k] && o.s.includes(lk.style) && !clashes({ ...lk, [k]: v }).length)); }
    for (const k of SLOTS) { if (recent.includes(k) || !f[k] || (only && only !== k)) continue; consider(k, FURN[f[k]], Object.values(FURN).filter(it => it.slot === k && it.k !== f[k] && it.s.includes(lk.style)).map(it => [it.k, it])); }
    if (!best) return null; hist.push(best.k); return { [best.k]: best.v };
  }
  const xOf = o => lookX(candLook(o.i, o.mod)), fOf = o => o.mod ? R.feat(itemsOf(candLook(o.i, o.mod))) : LFEAT[o.i];
  const shown = st => used.filter(u => style(u) === st).length;
  function pick(n, fixed) {
    const chosen = [...fixed], avail = LOOKS.map((_, i) => i).filter(i => !used.includes(i) && !fixed.some(o => o.i === i));
    while (chosen.length < n && avail.length) {
      let best = null;
      for (const i of avail) {
        if (chosen.some(o => style(o.i) === style(i))) continue;
        const o = { i, mod: null }; let info = chosen.length ? 0 : POOL[i].reduce((a, x, k) => a + E.v[k] * x * x, 0);
        for (const c of chosen) {
          const d = sub(xOf(o), xOf(c)), fd = sub(fOf(o), fOf(c)), p = sig(dot(E.mu, d) + (cfg.tagInfo ? dot(P.mu, fd) : 0));
          info += p * (1 - p) * (d.reduce((a, di, k) => a + E.v[k] * di * di, 0) + cfg.tagInfo * fd.reduce((a, x, j) => a + P.v[j] * x * x, 0));
        }
        const score = (info + .02 * r()) * .3 ** shown(style(i));
        if (!best || score > best.score) best = { o, score };
      }
      if (!best) break; chosen.push(best.o); avail.splice(avail.indexOf(best.o.i), 1);
    }
    return chosen;
  }
  let champ = null, taps = 0;
  for (let round = 0; round < cfg.rounds; round++) {
    let opts;
    if (cfg.n === 2 && !cfg.champion) { // old pairs: one option tuned toward the guess
      opts = pick(2, []); const side = dot(E.mu, POOL[opts[0].i]) >= dot(E.mu, POOL[opts[1].i]) ? 0 : 1; opts[side].mod = tune(opts[side].i, null, null);
    } else {
      const fixed = champ ? [(() => { const add = tune(champ.i, champ.mod, champ.fix); return { i: champ.i, mod: add ? { ...(champ.mod || {}), ...add } : champ.mod }; })()] : [];
      opts = pick(cfg.n, fixed);
    }
    const lks = opts.map(o => candLook(o.i, o.mod)), xs = lks.map(lookX), fs = lks.map(lk => R.feat(itemsOf(lk)));
    const j = user.choose(xs.map((x, k) => user.util(x, fs[k]))); taps++;
    const wItems = itemsOf(lks[j]), wt = cfg.n === 2 ? 1 : .6;
    opts.forEach((o, k) => { if (k === j) return; observe(E, sub(xs[j], xs[k]), 1, wt);
      if (cfg.bayes) R.pair(P, wItems, itemsOf(lks[k]), wt); else { learnOld(wItems, wt); learnOld(itemsOf(lks[k]), -wt); } });
    used.push(...opts.map(o => o.i).filter(i => !used.includes(i)));
    if (cfg.champion) {
      const f = furnOf(lks[j]), keys = [...PARTS.map(p => p.k), ...['table', 'chair', 'side'].filter(k => f[k])];
      const pieces = keys.map(k => [k, PART[k] ? PART[k].list[lks[j][k]] : FURN[f[k]]]), worst = pieces.map(([k, it]) => [k, it, user.pieceU(it)]).sort((a, b) => a[2] - b[2])[0];
      const fix = cfg.feedback && worst[2] < -.5 ? worst[0] : null; taps++;
      if (fix) { if (cfg.bayes) R.single(P, [worst[1]], 0, .7); else learnOld([worst[1]], -.7); if (PART[fix]) observe(E, optionX(worst[1]), 0, .4); }
      champ = { i: opts[j].i, mod: opts[j].mod, fix };
    }
  }
  // Evaluation: predicted score = dims + tag weights over the room's tag profile.
  const W = Wvec(), pred = c => dot(E.mu, c.x) + dot(W, c.f) / 2;
  const lookPred = LOOKS.map((_, i) => pred({ x: POOL[i], f: LFEAT[i] })), lookTrue = LOOKS.map((_, i) => user.util(POOL[i], LFEAT[i]));
  const best = CANDS.reduce((b, c) => { const p = pred(c); return p > b.p ? { c, p } : b; }, { p: -Infinity }).c;
  const trues = CANDS.map(c => user.util(c.x, c.f)), mx = Math.max(...trues), mean = trues.reduce((a, b) => a + b, 0) / trues.length, sd = Math.sqrt(trues.reduce((a, t) => a + (t - mean) ** 2, 0) / trues.length);
  return { rho: spearman(lookPred, lookTrue), regret: (mx - user.util(best.x, best.f)) / sd, taps, styleTop: topStyle(lookPred) === topStyle(lookTrue) };
}
function topStyle(scores) { const m = {}; LOOKS.forEach((lk, i) => { (m[lk.style] = m[lk.style] || []).push(scores[i]); }); return Object.entries(m).map(([n, v]) => [n, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0][0]; }
function rank(a) { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = Array(a.length); idx.forEach(([, i], k) => { r[i] = k; }); return r; }
function spearman(a, b) { const ra = rank(a), rb = rank(b), n = a.length; const d2 = ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0); return 1 - 6 * d2 / (n * (n * n - 1)); }

const OLD = { n: 2, rounds: 8, bayes: false, thompson: false, infoBonus: 0, tagInfo: 0, champion: false, feedback: false };
const NEW = { n: 4, rounds: 7, bayes: true, thompson: true, infoBonus: 0, tagInfo: .25, champion: true, feedback: true };
const CELLS = {
  'OLD 二選一 8 輪（8 次點擊）': OLD,
  'NEW 四選一 7 輪＋微調（14 次點擊）': NEW,
  'NEW 四選一 4 輪＋微調（8 次點擊）': { ...NEW, rounds: 4 },
  '消融：NEW 模型＋二選一 8 輪': { ...OLD, bayes: true, thompson: true, infoBonus: .35, tagInfo: .25 },
  '消融：四選一＋微調，但不用 Thompson（改用平均權重）': { ...NEW, thompson: false },
  '對照：NEW 加資訊獎勵 0.35': { ...NEW, infoBonus: .35 },
  '消融：四選一，不給微調回饋': { ...NEW, feedback: false },
};
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, se = a => Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1) / a.length);
const t0 = Date.now();
for (const temp of [.5, 1, 2]) {
  console.log(`\n## 作答雜訊 temp=${temp}（${USERS} 位模擬使用者）`);
  console.log('| 做法 | 排名相關 ρ | 最終遺憾（標準差單位，越低越好） | 風格第一名猜中 |');
  console.log('|---|---|---|---|');
  for (const [name, cfg] of Object.entries(CELLS)) {
    const res = []; for (let u = 0; u < USERS; u++) res.push(run(cfg, makeUser(1000 + u, temp), u));
    const rho = res.map(x => x.rho), reg = res.map(x => x.regret), st = res.map(x => x.styleTop ? 1 : 0);
    console.log(`| ${name} | ${mean(rho).toFixed(3)} ± ${se(rho).toFixed(3)} | ${mean(reg).toFixed(2)} ± ${se(reg).toFixed(2)} | ${(mean(st) * 100).toFixed(0)}% |`);
  }
}
if (process.argv.includes('--grid')) {
  console.log('\n## 係數格點（temp=1）：資訊獎勵 × 標籤資訊權重 → 遺憾');
  for (const ib of [0, .15, .35, .7]) for (const ti of [0, .25, .5]) {
    const res = []; for (let u = 0; u < USERS; u++) res.push(run({ ...NEW, infoBonus: ib, tagInfo: ti }, makeUser(5000 + u, 1), u));
    console.log(`infoBonus=${ib} tagInfo=${ti}: regret ${mean(res.map(x => x.regret)).toFixed(3)} ± ${se(res.map(x => x.regret)).toFixed(3)}, ρ ${mean(res.map(x => x.rho)).toFixed(3)}`);
  }
}
console.error(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
