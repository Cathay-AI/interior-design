// Experience audit for the prototype: run in the page at 390x844 with ?dev. Visits every screen through the jump
// menu and reports tap targets under 40px, text under 12px, text under 4.5:1 (3:1 large) on an opaque ground, and
// horizontal overflow. Used with the headless helper: node cdp.mjs <url>?dev out.png 390 844 0 "$(cat ux-audit.js)".
(async()=>{
const w=ms=>new Promise(r=>setTimeout(r,ms));
const L=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b,a]=m.map(Number);return {rgb:[r,g,b],a:a===undefined?1:a}};
const lum=([r,g,b])=>[r,g,b].map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const bgOf=el=>{for(let e=el;e;e=e.parentElement){const c=L(getComputedStyle(e).backgroundColor);if(c&&c.a>.9)return c.rgb;if(e.id==='screen')return null;}return null};
const out={};const j=document.getElementById('jump');
const screens=[...j.options].map(o=>o.value);
for(const v of screens){
  j.value=v;j.dispatchEvent(new Event('change'));await w(1600);
  const sc=document.getElementById('screen'),phone=document.getElementById('phone');const r={small:[],tiny:[],contrast:[],overflow:false};
  const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0'};
  phone.querySelectorAll('button,a,input,select,[data-act]').forEach(e=>{if(!vis(e)||e.closest('.notes'))return;const b=e.getBoundingClientRect();if(e.type==='range')return;if(b.height<40||b.width<40)r.small.push((e.textContent||e.getAttribute('aria-label')||e.className).trim().slice(0,14)+' '+Math.round(b.width)+'x'+Math.round(b.height))});
  sc.querySelectorAll('*').forEach(e=>{if(!vis(e))return;const t=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!t)return;const cs=getComputedStyle(e);if(parseFloat(cs.fontSize)<12)r.tiny.push(e.textContent.trim().slice(0,12)+' '+cs.fontSize);const bg=bgOf(e);const fg=L(cs.color);if(bg&&fg){const c=cr(fg.rgb,bg);const big=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.7&&cs.fontWeight>=700);if(c<(big?3:4.5))r.contrast.push(e.textContent.trim().slice(0,12)+' '+c.toFixed(2))}});
  r.overflow=sc.scrollWidth>sc.clientWidth+1;
  out[v]=r;
}
return out;})()
