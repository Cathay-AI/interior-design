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

/* ---------- 我家的條件：一句話（語音或打字）→ 坪數、長寬高、屋況 ---------- */
const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
/** 「八」「十二」「二十五」「五點六」「三米二」之類的口語數字 → 阿拉伯數字字串；語音辨識常這樣輸出。 */
export function normalizeNumbers(text) {
  const int = (s) => {
    if (!s.includes('十')) return [...s].map((c) => CN[c]).join('');
    const [a, b] = s.split('十');
    return String((a ? CN[a] : 1) * 10 + (b ? CN[b] : 0));
  };
  return text
    .replace(/[零〇一二兩三四五六七八九十]+(?:點[零〇一二兩三四五六七八九]+)?/g, (m) => {
      const [i, f] = m.split('點');
      return int(i) + (f ? '.' + [...f].map((c) => CN[c]).join('') : '');
    })
    .replace(/(\d+)\s*(?:米|公尺|m)\s*(\d)(?!\d|\s*(?:坪|米|公尺|公分|cm|m))/gi, '$1.$2公尺')   // 「5米6」= 5.6 公尺
    .replace(/(\d+(?:\.\d+)?)\s*(?:公分|cm)/gi, (_, v) => `${Number(v) / 100}公尺`);
}

/**
 * @param {string} text 例：「客廳大概八坪，長五米六、寬四米七，天花板兩米八，中古屋」
 * @returns {Partial<{space:string, ping:string, len:string, wid:string, height:string, age:string, floors:string, partition:'yes'|'no'}>} 只回傳聽得出來的欄位
 */
export function parseHome(text) {
  const t = normalizeNumbers(text), out = {};
  const N = '(\\d+(?:\\.\\d+)?)', U = '\\s*(?:米|公尺|m)?';
  const grab = (re) => { const m = t.match(re); return m ? num(m[1]) : ''; };
  const ping = grab(new RegExp(N + '\\s*坪'));
  if (ping) out.ping = ping;
  const pair = t.match(new RegExp(N + U + '\\s*(?:乘以|乘|x|X|×|\\*)\\s*' + N));
  const len = grab(new RegExp('長(?:度)?(?:大概|大約|約|是|有)?\\s*' + N)) || (pair ? num(pair[1]) : '');
  const wid = grab(new RegExp('寬(?:度)?(?:大概|大約|約|是|有)?\\s*' + N)) || (pair ? num(pair[2]) : '');
  if (len) out.len = len;
  if (wid) out.wid = wid;
  const height = grab(new RegExp('(?:天花板|挑高|樓高|屋高|高度|淨高)(?:高)?(?:大概|大約|約|是|有)?\\s*' + N));
  if (height) out.height = height;
  const floors = grab(new RegExp('(?:共|總共|總樓層|樓高|地上)\\s*' + N + '\\s*(?:層|樓)'))
    || grab(new RegExp(N + '\\s*(?:層樓?|樓)(?:高)?(?:的)?(?:電梯)?(?:大樓|公寓|華廈|建築|透天)'));
  if (floors) out.floors = floors;
  if (/不(?:會)?(?:動|改|拆|變更)隔間|隔間不(?:動|改|變)/.test(t)) out.partition = 'no';
  else if (/(?:動|改|拆|變更|打掉)隔間|隔間(?:要|會)?(?:動|改|重做|打掉)|(?:加|增設|多做)(?:一間)?(?:廁所|浴室)/.test(t)) out.partition = 'yes';
  const space = /主臥|臥室|臥房|睡房|房間/.test(t) ? '臥室' : /客廳/.test(t) ? '客廳' : null;   // 目前支援這兩種
  if (space) out.space = space;
  const age = AGES.find((a) => t.includes(a)) ?? (/新房|新屋|預售/.test(t) ? '新成屋' : /二手/.test(t) ? '中古屋' : /老房|老公寓/.test(t) ? '老屋' : null);
  if (age) out.age = age;
  return out;
}
