// 讀平面圖：瀏覽器把圖片或 PDF 送來，這裡請 Claude 讀出房間與尺寸再回傳。
// 金鑰只放在伺服器（Vercel 環境變數 ANTHROPIC_API_KEY），不會到瀏覽器。檔案不留存。
import Anthropic from '@anthropic-ai/sdk';
import { PLAN_SCHEMA, PLAN_PROMPT, roomsFromPlan, MAX_BYTES, MEDIA } from '../prototype/fast-route/lib/plan.js';

export const config = { maxDuration: 60 };

const send = (res, status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); };

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'failed' });
  // 只收自己網站送來的請求
  const origin = req.headers.origin;
  if (origin) { let host = ''; try { host = new URL(origin).host; } catch { /* 壞掉的 Origin 當成外站 */ } if (host !== req.headers.host) return send(res, 403, { error: 'failed' }); }
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'nokey' });

  const { media, data } = req.body ?? {};
  if (!MEDIA.includes(media) || typeof data !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(data)) return send(res, 400, { error: 'failed' });
  if (data.length * 0.75 > MAX_BYTES) return send(res, 413, { error: 'toobig' });

  const file = media === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: media, data } }
    : { type: 'image', source: { type: 'base64', media_type: media, data } };
  try {
    const client = new Anthropic();
    const message = await client.beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: PLAN_SCHEMA } },
      messages: [{ role: 'user', content: [file, { type: 'text', text: PLAN_PROMPT }] }],
    }).finalMessage();
    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') return send(res, 502, { error: 'failed' });
    const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let raw = null; try { raw = JSON.parse(text); } catch { /* 下面當成讀不出來 */ }
    if (raw && raw.is_floor_plan === false) return send(res, 200, { error: 'notplan' });
    const rooms = roomsFromPlan(raw);
    return rooms ? send(res, 200, { rooms }) : send(res, 502, { error: 'failed' });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return send(res, 503, { error: 'nokey' });
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'busy' });
    if (error instanceof Anthropic.APIError) { console.error('read-plan', error.status, error.message); return send(res, 502, { error: error.status === 413 ? 'toobig' : error.status >= 500 ? 'busy' : 'failed' }); }
    console.error('read-plan', error);
    return send(res, 500, { error: 'failed' });
  }
}
