// Demand rendering: draw only when something changed, coalesce input into one frame,
// and restore full detail once the whole gesture has settled. No animation loop.

/**
 * @param {{draw:()=>void, onInteraction:(moving:boolean)=>void, settleMs?:number,
 *   requestFrame?:Function, cancelFrame?:Function, setTimer?:Function, clearTimer?:Function}} deps
 */
export function createRenderScheduler({
  draw, onInteraction, settleMs = 240,
  requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let frame = null, timer = null, moving = false;
  const request = () => { if (frame === null) frame = requestFrame(() => { frame = null; draw(); }); };
  const finish = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (moving) { moving = false; onInteraction(false); }
    request();
  };
  return {
    /** Ask for one frame; many calls before the frame fires still draw once. */
    request,
    /** A gesture began: drop to the cheap mode and draw. */
    start() { if (timer !== null) clearTimer(timer); timer = null; if (!moving) { moving = true; onInteraction(true); } request(); },
    /** The gesture ended: restore detail after settleMs unless another gesture starts. */
    end() { if (timer !== null) clearTimer(timer); timer = setTimer(finish, settleMs); },
    finish,
    cancel() { if (frame !== null) cancelFrame(frame); if (timer !== null) clearTimer(timer); frame = timer = null; },
  };
}
