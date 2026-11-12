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
