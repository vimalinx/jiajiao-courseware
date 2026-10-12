/* ============================================================
   InkLayer 批注引擎 v1 —— 课件页面上直接圈画讲解
   用法：课件 </body> 前加一行  <script src="annotator.js"></script>
   要求页面有 deck.js 的 hash 页码（#N）；无 deck 时全部存在 '#1'。
   开/关：按 B 键 或 点左下角 ✎；Esc 退出。
   笔迹按页保存（会话内有效，刷新即清空）。
   ============================================================ */
(function(){
if(window.__INK)return;window.__INK=1;

const css=`
#inkcv,#inklz{position:fixed;inset:0;pointer-events:none}
#inklz{z-index:88}#inkcv{z-index:90}
body.ink-on #inkcv{pointer-events:auto;touch-action:none;cursor:crosshair}
body.ink-on{user-select:none}
#inkfab{position:fixed;left:.85em;bottom:.8em;z-index:95;width:2.35em;height:2.35em;border-radius:50%;border:1px solid rgba(24,22,17,.3);background:#fff;color:#181611;cursor:pointer;font-size:.92em;display:flex;align-items:center;justify-content:center}
body.ink-on #inkfab{background:#181611;color:#F6F3EA;border-color:#181611}
#inkbar{position:fixed;left:50%;bottom:.55em;transform:translateX(-50%);z-index:96;display:none;align-items:center;background:#fff;border:1px solid rgba(24,22,17,.25);padding:.28em .5em;font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.08)}
body.ink-on #inkbar{display:flex}
#inkbar button{border:none;background:transparent;padding:.32em .5em;cursor:pointer;font-size:.92em;color:#181611;border-radius:.25em;line-height:1.2;white-space:nowrap}
#inkbar button:hover{background:rgba(24,22,17,.07)}
#inkbar button.on{background:#181611;color:#fff}
#inkbar .sep{width:1px;height:1.25em;background:rgba(24,22,17,.18);margin:0 .3em;flex:none}
#inkbar .dot{width:1em;height:1em;border-radius:50%;border:1px solid rgba(0,0,0,.25);padding:0!important;margin:0 .15em}
#inkbar .dot.on{box-shadow:0 0 0 2px #fff,0 0 0 3.5px #181611}
#inktxt{position:fixed;z-index:97;display:none;border:none;border-bottom:1.5px solid #C2452A;background:rgba(255,255,255,.85);font-family:inherit;outline:none;padding:.15em .3em}
@media print{#inkcv,#inklz,#inkfab,#inkbar,#inktxt{display:none!important}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const cv=document.createElement('canvas');cv.id='inkcv';
const lz=document.createElement('canvas');lz.id='inklz';
const fab=document.createElement('button');fab.id='inkfab';fab.title='批注（B）';fab.textContent='✎';
const bar=document.createElement('div');bar.id='inkbar';
const inp=document.createElement('input');inp.id='inktxt';inp.placeholder='输入文字，Enter 落笔';
document.body.append(lz,cv,fab,bar,inp);

const TOOLS=[['pen','笔'],['hl','荧光'],['laser','激光'],['line','直线'],['arrow','箭头'],['rect','矩形'],['ellipse','椭圆'],['tri','三角'],['text','文字'],['eraser','橡皮']];
const COLORS=['#181611','#C2452A','#2B5FCC','#1FA97A','#B8860B'];
const SIZES=[['细',1.8],['中',3.2],['粗',5.5]];

const S={on:false,tool:'pen',color:'#C2452A',w:3.2,ops:new Map(),redo:new Map(),cur:null,draw:false,hidden:new Set(),laser:[]};
const ctx=cv.getContext('2d'),lctx=lz.getContext('2d');
const key=()=>location.hash||'#1';
const ops=()=>S.ops.get(key())||[];
const dpr=()=>window.devicePixelRatio||1;

function size(){
  for(const c of[cv,lz]){c.width=innerWidth*dpr();c.height=innerHeight*dpr();c.style.width=innerWidth+'px';c.style.height=innerHeight+'px'}
  ctx.setTransform(dpr(),0,0,dpr(),0,0);lctx.setTransform(dpr(),0,0,dpr(),0,0);
  redraw();
}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function segDist(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy;
  const t=L?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/L)):0;
  return dist(px,py,x1+t*dx,y1+t*dy);
}
function shapePts(o){ // 形状转多段折线，用于命中检测与绘制
  const{x0,y0,x1,y1}=o,pts=[];
  if(o.k==='line'||o.k==='arrow')return[[x0,y0,x1,y1]];
  if(o.k==='rect')return[[x0,y0,x1,y0],[x1,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,x0,y0]];
  if(o.k==='tri'){const mx=(x0+x1)/2;return[[mx,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,mx,y0]]}
  if(o.k==='ellipse'){
    const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=Math.abs(x1-x0)/2,ry=Math.abs(y1-y0)/2,segs=[];
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2;
      segs.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a),cx+rx*Math.cos(b),cy+ry*Math.sin(b)])}
    return segs;
  }
  return[];
}
function arrowHead(x0,y0,x1,y1,w){
  const a=Math.atan2(y1-y0,x1-x0),L=w*3+9;
  return[[x1,y1,x1-L*Math.cos(a-.42),y1-L*Math.sin(a-.42)],[x1,y1,x1-L*Math.cos(a+.42),y1-L*Math.sin(a+.42)]];
}
function drawOp(c,o){
  c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=o.c;c.fillStyle=o.c;
  if(o.t==='stroke'){
    c.globalCompositeOperation=o.hl?'multiply':'source-over';c.globalAlpha=o.hl?.32:1;
    for(let i=1;i<o.pts.length;i++){
      const p=o.pts[i-1],q=o.pts[i];
      c.lineWidth=o.w*(o.hl?3.2:1)*(.45+1.1*((p.pp+q.pp)/2||.5));
      c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();
    }
  }else if(o.t==='sh'){
    c.lineWidth=o.w;
    for(const s of shapePts(o)){c.beginPath();c.moveTo(s[0],s[1]);c.lineTo(s[2],s[3]);c.stroke()}
    if(o.k==='arrow')for(const s of arrowHead(o.x0,o.y0,o.x1,o.y1,o.w)){c.beginPath();c.moveTo(s[0],s[1]);c.lineTo(s[2],s[3]);c.stroke()}
  }else if(o.t==='tx'){
    c.font=`${o.fs}px "PingFang SC","Microsoft YaHei",sans-serif`;c.textBaseline='top';c.fillText(o.s,o.x,o.y);
  }
  c.restore();
}
function redraw(){
  ctx.clearRect(0,0,cv.width,cv.height);
  if(S.hidden.has(key()))return;
  for(const o of ops())drawOp(ctx,o);
  if(S.cur)drawOp(ctx,S.cur);
}
function hit(o,x,y){
  const r=(o.w||3)+7;
  if(o.t==='stroke'){for(let i=1;i<o.pts.length;i++)if(segDist(x,y,o.pts[i-1].x,o.pts[i-1].y,o.pts[i].x,o.pts[i].y)<r+o.w)return true;return o.pts.length&&dist(x,y,o.pts[0].x,o.pts[0].y)<r+o.w}
  if(o.t==='sh'){for(const s of shapePts(o))if(segDist(x,y,s[0],s[1],s[2],s[3])<r)return true;if(o.k==='arrow')for(const s of arrowHead(o.x0,o.y0,o.x1,o.y1,o.w))if(segDist(x,y,s[0],s[1],s[2],s[3])<r)return true;return false}
  if(o.t==='tx')return x>=o.x-4&&x<=o.x+o.s.length*o.fs*.62+4&&y>=o.y-4&&y<=o.y+o.fs*1.25;
  return false;
}

/* ---------- 交互 ---------- */
function pos(e){return{x:e.clientX,y:e.clientY}}
cv.addEventListener('pointerdown',e=>{
  if(!S.on)return;e.preventDefault();cv.setPointerCapture(e.pointerId);
  const{x,y}=pos(e);
  if(S.tool==='eraser'){erase(x,y);S.draw=true;return}
  if(S.tool==='text'){placeText(x,y);return}
  if(S.tool==='laser'){S.draw=true;S.ls={pts:[{x,y,t:performance.now()}]};laserTick();return}
  S.draw=true;
  if(S.tool==='pen'||S.tool==='hl')S.cur={t:'stroke',hl:S.tool==='hl',c:S.color,w:S.w,pts:[{x,y,pp:e.pressure||.5}]};
  else S.cur={t:'sh',k:S.tool,c:S.color,w:S.w,x0:x,y0:y,x1:x,y1:y};
  redraw();
});
cv.addEventListener('pointermove',e=>{
  if(!S.draw||!S.on)return;const{x,y}=pos(e);
  if(S.tool==='eraser'){erase(x,y);return}
  if(S.tool==='laser'){S.ls.pts.push({x,y,t:performance.now()});return}
  if(S.cur.t==='stroke')S.cur.pts.push({x,y,pp:e.pressure||.5});
  else{S.cur.x1=x;S.cur.y1=y;if(e.shiftKey){const d=Math.max(Math.abs(x-S.cur.x0),Math.abs(y-S.cur.y0));S.cur.x1=S.cur.x0+Math.sign(x-S.cur.x0)*d;S.cur.y1=S.cur.y0+Math.sign(y-S.cur.y0)*d}}
  redraw();
});
cv.addEventListener('pointerup',()=>{
  if(!S.on)return;S.draw=false;
  if(S.tool==='laser'){S.laser.push(S.ls);S.ls=null;return}
  if(S.cur){const m=S.ops.get(key())||[];m.push(S.cur);S.ops.set(key(),m);S.redo.set(key(),[]);S.cur=null;redraw()}
});
function erase(x,y){
  const m=ops().filter(o=>!hit(o,x,y));
  if(m.length!==ops().length){S.ops.set(key(),m);redraw()}
}
/* 文字批注 */
function placeText(x,y){
  inp.value='';inp.style.display='block';inp.style.left=x+'px';inp.style.top=y+'px';
  const fs=Math.round(parseFloat(getComputedStyle(document.body).fontSize)*1.35);
  inp.style.fontSize=fs+'px';inp.style.color=S.color;inp.focus();
  inp.onkeydown=e=>{e.stopPropagation();
    if(e.key==='Enter'){const s=inp.value.trim();inp.style.display='none';
      if(s){const m=ops();m.push({t:'tx',x,y,s,c:S.color,fs});S.ops.set(key(),m);redraw()}}
    if(e.key==='Escape')inp.style.display='none'};
}
/* 激光笔（渐隐轨迹，不落档） */
let lzRun=false;
function laserTick(){
  if(lzRun)return;lzRun=true;
  requestAnimationFrame(function loop(){
    const now=performance.now();
    lctx.clearRect(0,0,lz.width,lz.height);
    const draw=s=>{
      s.pts=s.pts.filter(p=>now-p.t<850);
      for(let i=1;i<s.pts.length;i++){
        const a=Math.max(0,1-(now-s.pts[i].t)/850);
        lctx.strokeStyle=`rgba(194,69,42,${a*.9})`;lctx.lineWidth=3+5*a;lctx.lineCap='round';
        lctx.beginPath();lctx.moveTo(s.pts[i-1].x,s.pts[i-1].y);lctx.lineTo(s.pts[i].x,s.pts[i].y);lctx.stroke();
      }
      return s.pts.length>0;
    };
    S.laser=S.laser.filter(draw);
    if(S.ls&&!draw(S.ls))S.ls=null;
    if(S.laser.length||S.ls||S.draw)requestAnimationFrame(loop);else lzRun=false;
  });
}

/* ---------- 工具栏 ---------- */
function buildBar(){
  bar.innerHTML='';
  for(const[t,l]of TOOLS){
    const b=document.createElement('button');b.textContent=l;b.dataset.t=t;
    if(t===S.tool)b.classList.add('on');
    b.onclick=e=>{e.stopPropagation();S.tool=t;bar.querySelectorAll('button[data-t]').forEach(x=>x.classList.toggle('on',x===b))};
    bar.appendChild(b);
  }
  bar.appendChild(sep());
  for(const c of COLORS){
    const d=document.createElement('button');d.className='dot'+(c===S.color?' on':'');d.style.background=c;
    d.onclick=e=>{e.stopPropagation();S.color=c;bar.querySelectorAll('.dot').forEach(x=>x.classList.toggle('on',x===d))};
    bar.appendChild(d);
  }
  bar.appendChild(sep());
  for(const[l,v]of SIZES){
    const b=document.createElement('button');b.textContent=l;if(v===S.w)b.classList.add('on');
    b.onclick=e=>{e.stopPropagation();S.w=v;bar.querySelectorAll('button[data-s]').forEach(x=>x.classList.remove('on'));b.dataset.s=1;b.classList.add('on')};
    b.dataset.s=1;if(v===S.w)b.classList.add('on');bar.appendChild(b);
  }
  bar.appendChild(sep());
  mkBtn('↶ 撤销',()=>{const m=ops();if(!m.length)return;const r=S.redo.get(key())||[];r.push(m.pop());S.redo.set(key(),r);redraw()});
  mkBtn('↷ 重做',()=>{const r=S.redo.get(key())||[];if(!r.length)return;const m=ops();m.push(r.pop());S.ops.set(key(),m);redraw()});
  mkBtn('清空',()=>{const m=ops();if(!m.length)return;S.redo.set(key(),[...m]);S.ops.set(key(),[]);redraw()});
  mkBtn(S.hidden.has(key())?'显迹':'隐迹',function(){S.hidden.has(key())?S.hidden.delete(key()):S.hidden.add(key());this.textContent=S.hidden.has(key())?'显迹':'隐迹';redraw()});
  mkBtn('退出',toggle);
}
function sep(){const s=document.createElement('span');s.className='sep';return s}
function mkBtn(l,f){const b=document.createElement('button');b.textContent=l;b.onclick=e=>{e.stopPropagation();f.call(b)};bar.appendChild(b)}

function toggle(){
  S.on=!S.on;document.body.classList.toggle('ink-on',S.on);
  if(S.on){cv.style.pointerEvents='auto';buildBar()}else{cv.style.pointerEvents='none';inp.style.display='none'}
}
fab.addEventListener('click',e=>{e.stopPropagation();toggle()});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea'))return;
  if(e.key==='b'||e.key==='B')toggle();
  else if(e.key==='Escape'&&S.on)toggle();
  else if(S.on&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();
    if(e.shiftKey){const r=S.redo.get(key())||[];if(r.length){const m=ops();m.push(r.pop());S.ops.set(key(),m);redraw()}}
    else{const m=ops();if(m.length){const r=S.redo.get(key())||[];r.push(m.pop());S.redo.set(key(),r);redraw()}}}
});
window.addEventListener('hashchange',redraw);
let inkPageKey=key();
new MutationObserver(()=>{const k=key();if(k!==inkPageKey){inkPageKey=k;redraw()}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
window.addEventListener('resize',size);
document.addEventListener('DOMContentLoaded',size);
if(document.readyState!=='loading')size();
})();
