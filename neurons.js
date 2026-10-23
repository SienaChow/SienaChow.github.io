// Alpha-aware picking, spring dynamics and a WebGL displacement pass.
// Original generated illustrations are decorative, not scientific reconstruction data.
(()=>{
const hero=document.querySelector('.hero'),field=document.querySelector('.cell-field');
const motion=document.querySelector('.motion-toggle'),status=document.querySelector('.cell-status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,visible=true,frame=0,last=0,active=null,pinned=null;
const pointer={x:-9999,y:-9999},cells=[...field.querySelectorAll('.cell')].map(el=>({el,img:el.querySelector('img'),x:0,y:0,vx:0,vy:0,angle:0,mask:null,gpu:null,local:{x:-10,y:-10}}));
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision mediump float;varying vec2 uv;uniform sampler2D texture0;uniform vec2 pointer;uniform float strength;void main(){vec2 d=uv-pointer;float r=length(d);float influence=exp(-r*r*28.);vec2 q=uv-d*influence*strength;gl_FragColor=texture2D(texture0,vec2(q.x,1.-q.y));}`;
function gpu(cell){
 const surface=document.createElement('canvas');surface.className='cell-surface';surface.setAttribute('aria-hidden','true');
 const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});if(!gl)return null;
 function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader unavailable');return s}
 try{
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cell.img);
 const point=gl.getUniformLocation(program,'pointer'),strength=gl.getUniformLocation(program,'strength');
 cell.el.insertBefore(surface,cell.el.querySelector('.cell-label'));cell.el.classList.add('has-gpu');
 surface.addEventListener('webglcontextlost',event=>{event.preventDefault();cell.el.classList.remove('has-gpu');cell.gpu=null});
 return {draw(){const iw=cell.img.naturalWidth,ih=cell.img.naturalHeight,fit=Math.min(cell.el.offsetWidth/iw,cell.el.offsetHeight/ih),cw=iw*fit,ch=ih*fit;
 const d=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(cw*d)),h=Math.max(1,Math.round(ch*d));if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;gl.viewport(0,0,w,h)}surface.style.width=cw+'px';surface.style.height=ch+'px';
 gl.uniform2f(point,cell.local.x,1-cell.local.y);gl.uniform1f(strength,paused?0:.22);gl.drawArrays(gl.TRIANGLES,0,6)}};
 }catch{return null}
}
function prepare(cell){
 const size=256,mask=document.createElement('canvas');mask.width=size;mask.height=size;const g=mask.getContext('2d',{willReadFrequently:true});g.drawImage(cell.img,0,0,size,size);cell.mask=g.getImageData(0,0,size,size).data;cell.gpu=gpu(cell);render(cell);
}
cells.forEach(cell=>{if(cell.img.complete&&cell.img.naturalWidth)prepare(cell);else cell.img.addEventListener('load',()=>prepare(cell),{once:true})});
function localPoint(cell,px,py){
 const r=hero.getBoundingClientRect(),cx=r.left+cell.el.offsetLeft+cell.el.offsetWidth/2+cell.x,cy=r.top+cell.el.offsetTop+cell.el.offsetHeight/2+cell.y;
 const a=-cell.angle*Math.PI/180,dx=px-cx,dy=py-cy,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);
 const ratio=cell.img.naturalWidth/Math.max(1,cell.img.naturalHeight),ew=cell.el.offsetWidth,eh=cell.el.offsetHeight,iw=Math.min(ew,eh*ratio),ih=iw/ratio;
 return {x:x/iw+.5,y:y/ih+.5,cx,cy};
}
function pick(px,py){
 for(const cell of [...cells].reverse()){
  if(!cell.mask)continue;const p=localPoint(cell,px,py);if(p.x<0||p.y<0||p.x>1||p.y>1)continue;
  const x=Math.floor(p.x*255),y=Math.floor(p.y*255);
  for(let a=-3;a<=3;a+=2)for(let b=-3;b<=3;b+=2){const sx=Math.max(0,Math.min(255,x+a)),sy=Math.max(0,Math.min(255,y+b));if(cell.mask[(sy*256+sx)*4+3]>30)return cell}
 }return null;
}
function select(cell){if(active===cell)return;active=cell;cells.forEach(c=>{c.el.classList.toggle('is-active',c===cell);c.el.setAttribute('aria-pressed',String(c===cell))});status.textContent=cell?cell.el.getAttribute('aria-label'):''}
hero.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;pointer.x=event.clientX;pointer.y=event.clientY;if(!pinned){const next=pick(pointer.x,pointer.y);if(next)select(next);else if(active){const p=localPoint(active,pointer.x,pointer.y);if(p.x<-.15||p.x>1.15||p.y<-.15||p.y>1.15)select(null)}}});
hero.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-9999;if(!pinned)select(null)});
cells.forEach(cell=>{
 cell.el.addEventListener('focus',()=>select(cell));cell.el.addEventListener('blur',()=>{if(!pinned)select(null)});
 cell.el.addEventListener('click',event=>{if(event.detail&&pick(event.clientX,event.clientY)!==cell)return;pinned=pinned===cell?null:cell;select(pinned)});
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=null;select(null)}});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.cell')){pinned=null;select(null)}});
function render(cell){cell.el.style.transform=`translate3d(${cell.x.toFixed(2)}px,${cell.y.toFixed(2)}px,0) rotate(${cell.angle.toFixed(3)}deg)`;cell.gpu?.draw()}
function step(dt){
 for(const cell of cells){const p=localPoint(cell,pointer.x,pointer.y),dx=p.cx-pointer.x,dy=p.cy-pointer.y,dist=Math.hypot(dx,dy),reach=Math.min(250,cell.el.offsetWidth*.8),force=Math.pow(Math.max(0,1-dist/reach),1.5)*900;
  cell.vx+=(dx/Math.max(dist,1)*force-cell.x*10-cell.vx*8)*dt;cell.vy+=(dy/Math.max(dist,1)*force-cell.y*10-cell.vy*8)*dt;cell.x+=cell.vx*dt*3;cell.y+=cell.vy*dt*3;
  const bound=65,len=Math.hypot(cell.x,cell.y);if(len>bound){cell.x*=bound/len;cell.y*=bound/len}cell.angle=cell.x*.055;cell.local=p;render(cell);
 }
}
function tick(now){if(paused||!visible||document.hidden)return;const dt=last?Math.min((now-last)/1000,.035):1/60;last=now;step(dt);frame=requestAnimationFrame(tick)}
function sync(){cancelAnimationFrame(frame);last=0;motion.textContent=paused?'Resume motion':'Pause motion';motion.setAttribute('aria-pressed',String(paused));if(paused)cells.forEach(cell=>{cell.x=cell.y=cell.vx=cell.vy=cell.angle=0;render(cell)});if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick)}
motion.addEventListener('click',()=>{paused=!paused;sync()});reduced.addEventListener('change',()=>{paused=reduced.matches;sync()});document.addEventListener('visibilitychange',sync);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()}).observe(hero);new ResizeObserver(()=>cells.forEach(render)).observe(hero);sync();
})();

