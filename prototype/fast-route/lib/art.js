// Illustration helpers: an isometric room drawn from a Style, plus the 亮亮 mascot.

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex, amt) {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** @param {import('./taste.js').Style} st */
export function roomSVG(st, { label } = {}) {
  const { wall, sofa, floor, accent, win } = st;
  const rug = st.rug ? `<path d="M200 268 L282 222 L200 176 L118 222 Z" fill="${st.rug}"/>` : '';
  return `<svg viewBox="0 -24 400 340" role="img" aria-label="${esc(label || st.name + '風格客廳示意')}">
  <rect x="0" y="-24" width="400" height="340" fill="${shade(wall, 0.55)}"/>
  <path d="M40 210 L200 120 L200 -8 L40 82 Z" fill="${wall}"/>
  <path d="M200 120 L360 210 L360 82 L200 -8 Z" fill="${shade(wall, -0.07)}"/>
  <path d="M200 300 L360 210 L200 120 L40 210 Z" fill="${floor}"/>
  <path d="M248 107 L320 147 L320 77 L248 37 Z" fill="${win}"/><path d="M284 57 L284 127 M248 72 L320 112" stroke="${shade(wall, 0.4)}" stroke-width="4"/>
  <path d="M248 107 L320 147 L262 262 L190 222 Z" fill="#fff6dc" opacity=".28"/>
  ${rug}
  <path d="M80 162 L152 123 L152 92 L80 131 Z" fill="${shade(sofa, -0.28)}"/>
  <path d="M80 162 L152 123 L187 143 L115 182 Z" fill="${sofa}"/>
  <path d="M115 208 L187 168 L187 143 L115 182 Z" fill="${shade(sofa, -0.16)}"/>
  <path d="M187 168 L152 148 L152 123 L187 143 Z" fill="${shade(sofa, -0.3)}"/>
  <path d="M226 214 L256 197 L226 180 L196 197 Z" fill="${accent}"/><path d="M196 197 L226 214 L226 228 L196 211 Z" fill="${shade(accent, -0.25)}"/><path d="M226 214 L256 197 L256 211 L226 228 Z" fill="${shade(accent, -0.4)}"/>
  <line x1="190" y1="-8" x2="190" y2="62" stroke="#3a332c" stroke-width="2"/><path d="M174 78 L206 78 L190 60 Z" fill="${accent}"/><circle cx="190" cy="84" r="34" fill="#ffe8b0" opacity=".25"/>
  <path d="M312 214 L316 236 L336 236 L340 214 Z" fill="${shade(accent, -0.1)}"/><ellipse cx="318" cy="194" rx="10" ry="24" fill="#5f7a6a" transform="rotate(-20 318 194)"/><ellipse cx="334" cy="192" rx="10" ry="26" fill="#7fa08c" transform="rotate(18 334 192)"/>
  </svg>`;
}

/** 亮亮（候選吉祥物），與 docs/proposal/product-design/mascot.svg 相同。 */
export const MASCOT = `<svg class="mascot" viewBox="-6 -6 212 212" role="img" aria-label="亮亮"><circle cx="100" cy="118" r="72" fill="#ffd98a" opacity="0.16"/><circle cx="100" cy="118" r="50" fill="#ffd98a" opacity="0.3"/><path d="M100 0v40" stroke="#29251f" stroke-width="2.2"/><rect x="93" y="36" width="14" height="10" rx="2" fill="#b8935a"/><path d="M62 113a38 38 0 0 0 76 0Z" fill="#fff0cc"/><path d="M100 44C60 44 34 76 30 113H170C166 76 140 44 100 44Z" fill="#a2562d"/><path d="M100 44C140 44 166 76 170 113H100Z" fill="#6f3518" opacity=".28"/><rect x="28" y="111" width="144" height="4.5" rx="2.2" fill="#c9a56a"/><circle cx="85.5" cy="130" r="3.1" fill="#29251f"/><circle cx="114.5" cy="130" r="3.1" fill="#29251f"/></svg>`;
