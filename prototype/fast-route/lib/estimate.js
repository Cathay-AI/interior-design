// 粗略報價: a budget range with its basis, never a single number.
// Unit prices are PRO360 2025 reference ranges (萬元／坪) and only show order of magnitude.

export const COST_PER_PING = { 新成屋: [3, 5], 中古屋: [5, 9], 老屋: [10, 20] };

/**
 * @param {{ping:string|number, age:string}} cond
 * @returns {null | {low:number, high:number, ping:number, unitLow:number, unitHigh:number}}
 *   null when 坪數 is missing: show 「暫無可靠估算」 instead of guessing.
 */
export function estimate(cond) {
  const ping = Number.parseFloat(cond.ping);
  if (!Number.isFinite(ping) || ping <= 0) return null;
  const unit = COST_PER_PING[cond.age];
  if (!unit) throw new Error(`unknown 屋況 ${cond.age}`);
  const [unitLow, unitHigh] = unit;
  return { low: Math.round(ping * unitLow), high: Math.round(ping * unitHigh), ping, unitLow, unitHigh };
}

/**
 * Compare a range with the homeowner's budget (萬元).
 * @returns {'none'|'within'|'partly'|'over'}
 */
export function budgetFit(range, budget) {
  const b = Number.parseFloat(budget);
  if (!range || !Number.isFinite(b)) return 'none';
  if (range.high <= b) return 'within';
  if (range.low <= b) return 'partly';
  return 'over';
}
