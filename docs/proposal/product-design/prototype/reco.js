// Tag-level preference model for the recommender.
// A Bayesian logistic (Bradley–Terry) model over the catalogue's tags: each tag has a Gaussian weight with a mean
// and a variance. Comparisons ("A over B") update on the difference of the two rooms' tag profiles; single
// reactions ("like this", "not this sofa") update on one profile. Updates are assumed-density filtering with a
// diagonal posterior, the same scheme as the three-dimension engine in prototype.js.
// The variances are what make the agent possible: they say which tags the model has not pinned down yet.
(() => {
  const { TAG_GROUPS } = window.HB_CATALOG;
  const TAGS = Object.values(TAG_GROUPS).flat();
  const IDX = Object.fromEntries(TAGS.map((t, i) => [t, i]));
  const GROUP = Object.fromEntries(Object.entries(TAG_GROUPS).flatMap(([g, ts]) => ts.map(t => [t, g])));
  // A tag present on every piece of a room contributes SCALE to that room's profile.
  const SCALE = 2, V0 = 1, VMIN = .04;
  const sig = z => 1 / (1 + Math.exp(-z));

  const fresh = () => ({ mu: TAGS.map(() => 0), v: TAGS.map(() => V0), n: 0 });
  function feat(items) {
    const f = TAGS.map(() => 0), n = Math.max(1, items.length);
    items.forEach(it => it.tags.forEach(t => { if (t in IDX) f[IDX[t]] += SCALE / n; }));
    return f;
  }
  function update(P, d, y, w = 1) {
    let z = 0, s = 0;
    for (let i = 0; i < d.length; i++) { z += P.mu[i] * d[i]; s += P.v[i] * d[i] * d[i]; }
    const p = sig(z), k = p * (1 - p);
    for (let i = 0; i < d.length; i++) {
      if (!d[i]) continue;
      P.mu[i] += w * P.v[i] * d[i] * (y - p) / (1 + k * s);
      P.v[i] = Math.max(VMIN, P.v[i] - w * P.v[i] * P.v[i] * d[i] * d[i] * k / (1 + k * s));
    }
    P.n++;
  }
  const pair = (P, win, lose, w = 1) => { const a = feat(win), b = feat(lose); update(P, a.map((x, i) => x - b[i]), 1, w); };
  const single = (P, items, y, w = 1) => update(P, feat(items), y, w);

  const meanOf = (P, it) => it.tags.reduce((a, t) => a + (t in IDX ? P.mu[IDX[t]] : 0), 0);
  // Thompson sampling: one draw of every weight from its posterior.
  function sample(P, r) {
    return P.mu.map((m, i) => { const u = Math.max(1e-9, r()), v = r(); return m + Math.sqrt(P.v[i]) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); });
  }
  const sampledOf = (W, it) => it.tags.reduce((a, t) => a + (t in IDX ? W[IDX[t]] : 0), 0);
  // How much a swap would teach: the posterior variance of the tags that change.
  const infoOf = (P, from, to) => to.tags.filter(t => !from.tags.includes(t) && t in IDX).reduce((a, t) => a + P.v[IDX[t]], 0)
    + from.tags.filter(t => !to.tags.includes(t) && t in IDX).reduce((a, t) => a + P.v[IDX[t]], 0);
  // Mean variance per tag group, most uncertain first.
  const groupUncertainty = P => Object.entries(TAG_GROUPS).map(([g, ts]) => ({ g, u: ts.reduce((a, t) => a + P.v[IDX[t]], 0) / ts.length })).sort((a, b) => b.u - a.u);
  const weight = (P, t) => ({ mu: P.mu[IDX[t]], sd: Math.sqrt(P.v[IDX[t]]) });

  window.HB_RECO = { TAGS, IDX, GROUP, fresh, feat, update, pair, single, meanOf, sample, sampledOf, infoOf, groupUncertainty, weight };
})();
