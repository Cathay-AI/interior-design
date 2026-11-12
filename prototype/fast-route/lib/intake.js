// Intake: turn a voice/text transcript into the few fields we need. Unknown stays unknown.

export const SPACES = ['客廳', '臥室', '書房', '餐廳'];
export const AGES = ['新成屋', '中古屋', '老屋'];
export const CITIES = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '新竹縣市', '其他'];

const num = (s) => {
  if (!s) return '';
  const v = Number.parseFloat(s);
  return Number.isFinite(v) ? String(v) : '';
};

/**
 * @param {string} text e.g. 「客廳大約 8 坪，預算 50 萬內，中古屋在新北市」
 * @returns {Partial<{space:string, ping:string, budget:string, age:string, city:string}>}
 *   Only fields found in the text; callers merge it into the current form.
 */
export function parseIntake(text) {
  const out = {};
  const ping = text.match(/(\d+(?:\.\d+)?)\s*坪/);
  if (ping) out.ping = num(ping[1]);
  const budget = text.match(/(\d+(?:\.\d+)?)\s*萬/);
  if (budget) out.budget = num(budget[1]);
  const space = SPACES.find((s) => text.includes(s));
  if (space) out.space = space;
  const age = AGES.find((s) => text.includes(s));
  if (age) out.age = age;
  const city = CITIES.slice(0, -1).find((c) => text.includes(c.slice(0, 2)));
  if (city) out.city = city;
  return out;
}

const STYLE_WORDS = {
  warm: ['木質', '溫暖', '木頭', '暖'],
  nordic: ['北歐', '明亮', '白色'],
  muji: ['無印', '日式', '日系', '簡約'],
  retro: ['復古', '懷舊'],
  dark: ['深色', '黑', '現代'],
  indus: ['工業', '水泥', '鐵件'],
};

/**
 * Guess a style key from the transcript. Returns null when nothing matches,
 * so the UI can say 「我猜的」 instead of pretending to know.
 * @param {string} text
 * @returns {keyof typeof STYLE_WORDS | null}
 */
export function inferStyle(text) {
  let best = null, bestHits = 0;
  for (const [key, words] of Object.entries(STYLE_WORDS)) {
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > bestHits) { best = key; bestHits = hits; }
  }
  return best;
}
