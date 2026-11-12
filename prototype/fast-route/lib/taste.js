// Taste engine for the 快速找風格 route: 看屋 choices -> 口味圖譜 -> 佈置方向.
// Pure functions only, so the decision logic can be tested without a browser.

/** @typedef {{name:string, wall:string, floor:string, sofa:string, rug:string|null, accent:string, win:string, x:number, y:number, tags:string[]}} Style */

/** x: 冷(-1) ↔ 暖(+1); y: 簡約(-1) ↔ 豐富(+1) */
export const STYLES = {
  warm:   { name: '溫暖木質', wall: '#f1e6d6', floor: '#c9a77c', sofa: '#5f7a6a', rug: '#b5653a', accent: '#8f4c2a', win: '#cfe3ea', x: 0.65, y: -0.25, tags: ['溫暖木質', '自然光', '低裝飾'] },
  nordic: { name: '日光北歐', wall: '#f7f5f0', floor: '#e6d7bd', sofa: '#a9b0b3', rug: '#ddd3c4', accent: '#7e9fb4', win: '#d8ecf3', x: -0.55, y: -0.35, tags: ['明亮淺色', '簡潔線條', '冷調點綴'] },
  retro:  { name: '暖調復古', wall: '#c97b54', floor: '#7a4a2c', sofa: '#8f4c2a', rug: '#e3c99a', accent: '#d9a441', win: '#f2d9a7', x: 0.8, y: 0.75, tags: ['濃郁色彩', '木作家具', '懷舊'] },
  dark:   { name: '深色現代', wall: '#45403a', floor: '#5a4f45', sofa: '#2b2621', rug: '#8a7f72', accent: '#c9a77c', win: '#9fb3bf', x: -0.6, y: 0.35, tags: ['深色牆面', '俐落', '金屬點綴'] },
  muji:   { name: '無印日式', wall: '#efe9dd', floor: '#d9bf93', sofa: '#cfc2ad', rug: '#efe7db', accent: '#7fa08c', win: '#dfeee8', x: 0.35, y: -0.7, tags: ['淺木色', '米白', '收納'] },
  indus:  { name: '工業風', wall: '#a8a39b', floor: '#6e6a64', sofa: '#5a3f2e', rug: '#4d443b', accent: '#2b2621', win: '#c5d2d8', x: -0.25, y: 0.7, tags: ['水泥灰', '黑鐵', '皮革'] },
};

/** 看屋的二選一題組：每題刻意放差異大的兩種風格。 */
export const PAIRS = [['warm', 'dark'], ['nordic', 'retro'], ['muji', 'indus'], ['warm', 'nordic'], ['muji', 'retro']];

export const DISLIKE_REASONS = ['太冷', '太滿', '太暗', '太華麗'];

export const WALL_SWATCHES = [
  { name: '暖白', color: '#f3ece0' },
  { name: '灰綠', color: '#c9d3c6' },
  { name: '陶土', color: '#d9a083' },
  { name: '淺灰', color: '#dedbd5' },
];

/** @returns {Record<string, number>} */
export function emptyScores(styles = STYLES) {
  return Object.fromEntries(Object.keys(styles).map((k) => [k, 0]));
}

/**
 * Record one 看屋 answer. `choice` is a style key from `pair`, or null for 「兩間都不喜歡」.
 * Returns a new score object; the input is not mutated.
 */
export function applyChoice(scores, pair, choice) {
  const next = { ...scores };
  if (choice === null) {
    for (const k of pair) next[k] -= 1;
    return next;
  }
  if (!pair.includes(choice)) throw new Error(`choice ${choice} is not in pair ${pair.join('/')}`);
  next[choice] += 2;
  return next;
}

/** Add extra weight to a style (used by 我已經有想法 → 確認口味). */
export function boost(scores, key, amount) {
  return { ...scores, [key]: (scores[key] ?? 0) + amount };
}

/**
 * Position on the 口味圖譜 = score-weighted average of liked styles; ties keep STYLES order.
 * @returns {{x:number, y:number, ranked:string[]}}
 */
export function tasteResult(scores, styles = STYLES) {
  const keys = Object.keys(styles);
  const ranked = [...keys].sort((a, b) => scores[b] - scores[a] || keys.indexOf(a) - keys.indexOf(b));
  let x = 0, y = 0, w = 0;
  for (const k of ranked) {
    const v = Math.max(0, scores[k]);
    x += styles[k].x * v; y += styles[k].y * v; w += v;
  }
  return w ? { x: x / w, y: y / w, ranked } : { x: 0, y: 0, ranked };
}

/** 主方向、相鄰方向，加上一個離主方向最遠的挑戰者，避免只確認已知的口味。 */
export function directions(scores, styles = STYLES) {
  const { ranked } = tasteResult(scores, styles);
  const [top, adjacent] = ranked;
  const dist = (k) => Math.hypot(styles[k].x - styles[top].x, styles[k].y - styles[top].y);
  const challenger = ranked.filter((k) => k !== top && k !== adjacent).sort((a, b) => dist(b) - dist(a))[0];
  return [
    { key: top, role: '主方向' },
    { key: adjacent, role: '相鄰方向' },
    { key: challenger, role: '挑戰者' },
  ];
}

/** Human-readable summary like 「偏暖、簡約」. */
export function describe({ x, y }) {
  return `${x >= 0 ? '偏暖' : '偏冷'}、${y <= 0 ? '簡約' : '豐富'}`;
}
