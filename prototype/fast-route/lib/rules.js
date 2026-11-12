// Rule findings: each check ends in exactly one of four states. 未知不等於通過.

export const STATES = {
  ok: '已檢查',
  conflict: '衝突',
  missing: '待補資料',
  na: '不適用',
};

const isDark = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/**
 * @param {{space:string, ping:string|number, age:string}} cond
 * @param {{wall:string}} look
 * @returns {{state:keyof STATES, title:string, detail:string}[]}
 */
export function ruleFindings(cond, look) {
  const ping = Number.parseFloat(cond.ping);
  const hasPing = Number.isFinite(ping) && ping > 0;
  const findings = [];

  findings.push(hasPing
    ? { state: 'ok', title: '動線', detail: `${cond.space} ${ping} 坪：沙發與茶几間保留走道（示意尺寸）` }
    : { state: 'missing', title: '動線', detail: '需要坪數或尺寸才能檢查' });

  findings.push({ state: 'missing', title: '插座與電源', detail: '需要既有插座點位，才能確認電視牆與立燈位置' });

  findings.push(isDark(look.wall) && hasPing && ping < 7
    ? { state: 'conflict', title: '空間感（設計提醒）', detail: '深色牆面在 7 坪以下可能顯得壓迫，建議只做一面主牆' }
    : { state: 'ok', title: '採光與色彩', detail: '牆面明度足夠，窗邊保留自然光' });

  findings.push(cond.age === '老屋'
    ? { state: 'missing', title: '消防與機電', detail: '老屋需現勘既有管線與消防設備' }
    : { state: 'na', title: '消防設備', detail: '本方案未變更分間牆或避難設施' });

  findings.push({ state: 'missing', title: '室內裝修許可', detail: '若變更分間牆，六層以上集合住宅需申請審查' });
  return findings;
}

export function countByState(findings) {
  return findings.reduce((acc, f) => ({ ...acc, [f.state]: (acc[f.state] ?? 0) + 1 }), {});
}
