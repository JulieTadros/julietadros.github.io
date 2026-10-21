const galleries=[];
let keyboardNavigation=false;
document.addEventListener('keydown',e=>{if(e.key==='Tab')keyboardNavigation=true;});
document.addEventListener('pointerdown',()=>{keyboardNavigation=false;},true);
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
document.body.dataset.divider=new URLSearchParams(location.search).get('divider')==='line'?'line':'vintage';
document.querySelectorAll('.project-gallery').forEach(gallery=>{
 const slides=[...gallery.querySelectorAll('.gallery-slide')];
 const buttons=[...gallery.querySelectorAll('[data-slide-index]')];
 const caption=gallery.querySelector('.slide-caption');
 const auto=gallery.dataset.autoplay==='true'&&!new URLSearchParams(location.search).has('preview');
 const featured=Math.min(Number(gallery.dataset.featuredCount)||slides.length,slides.length);
 let index=0,visible=false,controlHovered=false,focused=false,userPaused=false,timer=null,resumeTimer=null;
 const stop=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{
  const play=auto&&visible&&!controlHovered&&!focused&&!userPaused&&!document.hidden&&!reducedMotion.matches&&!document.querySelector('.image-dialog').open;
  gallery.dataset.autoState=userPaused?'manual':play?'playing':'idle';
  if(!play){stop();return;}
  if(!timer)timer=setTimeout(()=>{timer=null;show((index+1)%featured);},5200);
 };
 const show=(n,manual=false)=>{
  index=(n+slides.length)%slides.length;
  slides.forEach((slide,i)=>slide.hidden=i!==index);
  buttons.forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
  caption.setAttribute('aria-live',manual?'polite':'off');
  caption.textContent=buttons[index].getAttribute('aria-label');
  if(manual&&auto){userPaused=true;clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{userPaused=false;schedule();},4000);}
  requestAnimationFrame(()=>updateArrowTone(gallery));
  schedule();
 };
 buttons.forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.slideIndex),true)));
 gallery.querySelector('.previous-slide')?.addEventListener('click',()=>show(index-1,true));
 gallery.querySelector('.next-slide')?.addEventListener('click',()=>show(index+1,true));
 gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1),true);}});
 let touchX=0;
 gallery.querySelector('.gallery-stage').addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
 gallery.querySelector('.gallery-stage').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>60)show(index+(dx<0?1:-1),true);},{passive:true});
 gallery.querySelectorAll('.image-arrow,.view-controls').forEach(control=>{
  control.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){controlHovered=true;schedule();}});
  control.addEventListener('pointerleave',()=>{controlHovered=false;schedule();});
 });
 gallery.addEventListener('focusin',()=>{focused=keyboardNavigation&&(!!gallery.querySelector(':focus-visible')||gallery.matches(':focus-visible'));schedule();});
 gallery.addEventListener('focusout',e=>{if(!gallery.contains(e.relatedTarget)){focused=false;schedule();}});
 if(auto)new IntersectionObserver(entries=>{
  for(const entry of entries){const wasVisible=visible;visible=entry.intersectionRatio>=.2;if(!visible){userPaused=false;focused=false;controlHovered=false;clearTimeout(resumeTimer);}if(visible&&!wasVisible&&index>=featured)show(0);else schedule();}
 },{threshold:[0,.2,.6]}).observe(gallery.querySelector('.gallery-stage'));
 gallery.querySelectorAll('img').forEach(img=>img.addEventListener('load',()=>updateArrowTone(gallery)));
 requestAnimationFrame(()=>updateArrowTone(gallery));
 if(new URLSearchParams(location.search).has('preview')&&gallery.getAttribute('aria-label')==='Bauhaus Penthouse gallery')show(2);
 galleries.push({schedule,stop});
});
// Sample the displayed edge of each local image so the bare chevrons remain legible.
function updateArrowTone(gallery){
 const stage=gallery.querySelector('.gallery-stage'),arrows=[...gallery.querySelectorAll('.image-arrow')];
 if(!arrows.length||!stage.clientWidth)return;
 const box=stage.getBoundingClientRect(),canvas=document.createElement('canvas');canvas.width=180;canvas.height=140;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#F9F9F9';ctx.fillRect(0,0,180,140);
 const sx=180/box.width,sy=140/box.height;
 try{
  gallery.querySelectorAll('.gallery-slide:not([hidden]) img').forEach(img=>{
   if(!img.complete||!img.naturalWidth)return;
   const r=img.getBoundingClientRect(),style=getComputedStyle(img),fit=style.objectFit;
   const scale=(fit==='contain'?Math.min:Math.max)(r.width/img.naturalWidth,r.height/img.naturalHeight);
   const pos=style.objectPosition.split(' ').map(v=>parseFloat(v)/100);
   const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
   const x=r.left-box.left+(r.width-w)*(Number.isFinite(pos[0])?pos[0]:.5),y=r.top-box.top+(r.height-h)*(Number.isFinite(pos[1])?pos[1]:.5);
   ctx.save();ctx.beginPath();ctx.rect((r.left-box.left)*sx,(r.top-box.top)*sy,r.width*sx,r.height*sy);ctx.clip();ctx.drawImage(img,x*sx,y*sy,w*sx,h*sy);ctx.restore();
  });
  arrows.forEach(arrow=>{const r=arrow.getBoundingClientRect(),x=Math.max(2,Math.min(177,Math.round((r.left+r.width/2-box.left)*sx))),y=70;const data=ctx.getImageData(x-2,y-2,5,5).data;let light=0;for(let i=0;i<data.length;i+=4)light+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];arrow.style.color=light/25>135?'#000':'#fff';});
 }catch{arrows.forEach(arrow=>arrow.style.color='#000');}
}
window.addEventListener('resize',()=>document.querySelectorAll('.project-gallery').forEach(updateArrowTone));
const imageDialog=document.querySelector('.image-dialog');document.querySelectorAll('.image-zoom').forEach(button=>button.addEventListener('click',()=>{const image=button.querySelector('img');imageDialog.querySelector('img').src=image.getAttribute('src');imageDialog.querySelector('img').alt=image.alt;imageDialog.querySelector('p').textContent=image.alt;galleries.forEach(g=>g.stop());imageDialog.showModal();}));imageDialog.querySelector('.close-image').addEventListener('click',()=>imageDialog.close());imageDialog.addEventListener('close',()=>galleries.forEach(g=>g.schedule()));imageDialog.addEventListener('click',e=>{if(e.target===imageDialog){const r=imageDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)imageDialog.close();}});document.addEventListener('visibilitychange',()=>galleries.forEach(g=>g.schedule()));reducedMotion.addEventListener('change',()=>galleries.forEach(g=>g.schedule()));

// Keep the desktop project description aligned with the image, excluding controls.
const alignedFeatures=[...document.querySelectorAll('.feature')];
const alignProjectText=()=>alignedFeatures.forEach(feature=>{const stage=feature.querySelector('.gallery-stage');if(stage)feature.style.setProperty('--image-height',stage.getBoundingClientRect().height+'px');});
const projectSizes=new ResizeObserver(alignProjectText);
alignedFeatures.forEach(feature=>{const stage=feature.querySelector('.gallery-stage');if(stage)projectSizes.observe(stage);});
alignProjectText();
// Size the lightbox to the actual image, with equal padding on all four sides.
const enlargedImage=imageDialog.querySelector('img');
const fitEnlargedImage=()=>{if(!enlargedImage.naturalWidth)return;const scale=Math.min((innerWidth*.92-56)/enlargedImage.naturalWidth,(innerHeight*.88-56)/enlargedImage.naturalHeight,1);enlargedImage.style.width=Math.round(enlargedImage.naturalWidth*scale)+'px';};
enlargedImage.addEventListener('load',fitEnlargedImage);
window.addEventListener('resize',fitEnlargedImage);
