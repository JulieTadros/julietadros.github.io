(()=>{
 document.querySelectorAll('.web-screen').forEach(frame=>{
  const screen=frame.querySelector('iframe');const width=frame.dataset.mobile?390:1300;
  let cropHeight=frame.dataset.cropBefore?2000:null,ready=false,cropStart=0;
  const fit=()=>{const scale=frame.clientWidth/width;screen.style.transform='translateY('+(-cropStart*scale)+'px) scale('+scale+')';if(cropHeight)frame.style.height=(cropHeight*scale)+'px'};
  const measure=()=>{try{
   const doc=screen.contentDocument;if(!doc||!doc.body)return;
   cropStart=0;
   if(frame.dataset.cropStart){const start=doc.querySelector(frame.dataset.cropStart);if(start)cropStart=Math.ceil(start.getBoundingClientRect().top+screen.contentWindow.scrollY);}
   if(frame.dataset.cropHeader){doc.querySelectorAll('#site-header,#app>header,.concept-banner').forEach(el=>{cropStart=Math.max(cropStart,Math.ceil(el.getBoundingClientRect().bottom+screen.contentWindow.scrollY))});}
   if(!frame.dataset.cropBefore){screen.style.height=(1100+cropStart)+'px';fit();return;}
   const boundary=doc.querySelector(frame.dataset.cropBefore);if(!boundary)return;
   const end=Math.ceil(boundary.getBoundingClientRect().top+screen.contentWindow.scrollY);
   if(end>300&&end<12000){cropHeight=end-cropStart;screen.style.height=end+'px';fit();}
  }catch{}};
  const loaded=()=>{if(!frame.dataset.cropBefore&&!frame.dataset.cropHeader){fit();return;}try{
   const doc=screen.contentDocument;if(!doc||!doc.body)return;
   if(!doc.getElementById('portfolio-excerpt-style')){
    const style=doc.createElement('style');style.id='portfolio-excerpt-style';style.textContent='html{overflow:hidden!important;scroll-behavior:auto!important}body{overflow:hidden!important;padding-top:0!important}.concept-banner,.demo-banner{display:none!important}.immersive-home #app>header{top:0!important}.immersive-home .hero-editorial{min-height:860px!important}';doc.head.append(style);
   }
   screen.contentWindow.scrollTo(0,0);measure();
   if(!ready){ready=true;doc.fonts.ready.then(measure);doc.querySelectorAll('img').forEach(img=>img.addEventListener('load',measure));const observer=new ResizeObserver(measure);doc.querySelectorAll('main>section,.hero-editorial,.intro.panel,.featurestrip').forEach(el=>observer.observe(el));}
  }catch{} };
  new ResizeObserver(fit).observe(frame);screen.addEventListener('load',loaded);fit();if(screen.contentDocument?.readyState==='complete')loaded();
 });
})();