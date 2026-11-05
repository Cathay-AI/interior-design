(()=>{
  const slides=[...document.querySelectorAll('.slide')];
  const total=slides.length, chapter=document.getElementById('chapter');
  const number=document.getElementById('page-number');
  const previous=document.getElementById('previous'), next=document.getElementById('next');
  const starts=[1,2,3,7,10,13,17,20,24,29];
  const readHash=()=>{const m=location.hash.match(/^#(?:page-|slide-)?(\d+)$/);return Math.max(1,Math.min(total,m?+m[1]:1))};
  let page=readHash(),reading=false;
  slides.forEach(slide=>{const title=slide.querySelector('.slide-head h2');if(title&&title.textContent.length>23)slide.classList.add('long-title')});
  function render(scroll=true){
    slides.forEach((slide,i)=>{slide.hidden=i!==page-1;slide.inert=!reading&&i!==page-1});
    number.value=page;previous.disabled=page===1;next.disabled=page===total;
    chapter.value=[...starts].reverse().find(n=>n<=page);
    document.getElementById('announcement').textContent=`第 ${page} 頁，共 ${total} 頁`;
    const url=new URL(location.href);url.hash=`page-${page}`;history.replaceState(null,'',url);
    if(scroll){if(reading)slides[page-1].scrollIntoView({block:'start'});else window.scrollTo({top:0,behavior:'instant'})}
  }
  function go(value){page=Math.max(1,Math.min(total,Number.isFinite(+value)?Math.round(+value):1));render()}
  previous.addEventListener('click',()=>go(page-1));next.addEventListener('click',()=>go(page+1));
  number.addEventListener('change',()=>go(parseInt(number.value,10)));
  chapter.addEventListener('change',()=>go(chapter.value));
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.page)));
  document.getElementById('mode').addEventListener('click',()=>{reading=!reading;document.body.classList.toggle('reading',reading);document.getElementById('mode').textContent=reading?'簡報模式':'閱讀模式';render()});
  document.getElementById('font-size').addEventListener('click',()=>{const active=document.body.classList.toggle('large-text');document.getElementById('font-size').textContent=active?'A－':'A＋';document.getElementById('font-size').setAttribute('aria-pressed',String(active))});
  document.getElementById('print').addEventListener('click',()=>window.print());
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    // Wide diagrams retain native keyboard scrolling while focused inside them.
    if(event.target.closest('.wide-scroll,.chart-scroll,.table-scroll,.storyboard'))return;
    if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(page+1)}
    else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(page-1)}
    else if(event.key==='Home'){event.preventDefault();go(1)}
    else if(event.key==='End'){event.preventDefault();go(total)}
  });
  let touch;
  document.getElementById('deck').addEventListener('touchstart',event=>{
    // A swipe within an intentionally wide diagram must pan that diagram.
    if(reading||event.target.closest('.wide-scroll,.chart-scroll,.table-scroll,.storyboard,button,a,input,select')){touch=null;return}
    touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;
  },{passive:true});
  document.getElementById('deck').addEventListener('touchend',event=>{
    if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.7)go(page+(dx<0?1:-1));
  },{passive:true});
  window.addEventListener('hashchange',()=>{page=readHash();render()});
  document.querySelectorAll('.wide-scroll,.chart-scroll,.table-scroll,.storyboard').forEach(el=>{el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label','可左右捲動的原生圖表')});
  render(false);
})();
