/* ============================================================
   deck.js —— HTML 课件放映引擎 v0.2
   约定：.slide 全屏页；.rv 逐步揭示；[data-goto] 点击跳页；
        .blank 点击揭答；.opt[data-ok="0/1"] 点击判对错。
   URL：#N 定位页码 · ?all 全亮 · ?embed 隐藏家具
   ============================================================ */
const slides=[...document.querySelectorAll('.slide')];
let cur=0;
const $=s=>document.querySelector(s);
/* 揭示次序：data-rv 相同编号的元素同组同亮（文字步骤 ↔ 图形辅助线 ↔ 讲稿段）；
   未标 data-rv 的 .rv 按 DOM 顺序排在编号组之后 */
const rvKey=new WeakMap();
slides.forEach(s=>[...s.querySelectorAll('.rv')].forEach((el,i)=>rvKey.set(el,el.dataset.rv!==undefined?+el.dataset.rv:10000+i)));
function sync(){
  slides.forEach((s,i)=>s.classList.toggle('on',i===cur));
  const bar=$('#prog')||$('#bar');if(bar)bar.style.width=((cur+1)/slides.length*100)+'%';
  const pg=$('#page');if(pg)pg.innerHTML='<b>'+String(cur+1).padStart(2,'0')+'</b> / '+String(slides.length).padStart(2,'0');
  const sec=$('#secname');if(sec)sec.innerHTML=slides[cur].dataset.sec||'';
  history.replaceState(null,'','#'+(cur+1));
}
function next(){
  const hid=[...slides[cur].querySelectorAll('.rv:not(.show)')];
  if(hid.length){const k=Math.min(...hid.map(e=>rvKey.get(e)));
    hid.filter(e=>rvKey.get(e)===k).forEach(e=>e.classList.add('show'));return}
  if(cur<slides.length-1){cur++;sync()}
}
function prev(){
  const rev=[...slides[cur].querySelectorAll('.rv.show')];
  if(rev.length){const k=Math.max(...rev.map(e=>rvKey.get(e)));
    rev.filter(e=>rvKey.get(e)===k).forEach(e=>e.classList.remove('show'));return}
  if(cur>0){cur--;sync()}
}
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea'))return;
  if(document.body.classList.contains('ink-on'))return;
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();next()}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();prev()}
  else if(e.key==='Home'){cur=0;sync()}
  else if(e.key==='End'){cur=slides.length-1;sync()}
  else if(e.key.toLowerCase()==='p'){window.print()}
});
document.addEventListener('click',e=>{
  if(document.body.classList.contains('ink-on'))return;           /* 批注中不翻页 */
  const bl=e.target.closest('.blank');if(bl){bl.classList.toggle('on');return}
  const op=e.target.closest('.opt[data-ok]');if(op){op.classList.add(op.dataset.ok==='1'?'right':'wrong');op.dataset.done=1;return}
  if(!e.target.closest('button,[data-goto],input'))next();
});
const pv=$('#prev'),nx=$('#next');
if(pv)pv.onclick=prev; if(nx)nx.onclick=next;
document.querySelectorAll('[data-goto]').forEach(el=>el.onclick=()=>{cur=+el.dataset.goto;sync()});
const h=parseInt(location.hash.slice(1));if(h>=1&&h<=slides.length)cur=h-1;
if(location.search.includes('embed'))document.body.classList.add('embed');
if(location.search.includes('all'))slides.forEach(s=>s.querySelectorAll('.rv').forEach(r=>r.classList.add('show')));
window.addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1));if(n>=1&&n<=slides.length){cur=n-1;sync()}});
sync();
/* KaTeX 渲染（存在即启用） */
if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:'\\(',right:'\\)'},{left:'$$',right:'$$'}],throwOnError:false});
