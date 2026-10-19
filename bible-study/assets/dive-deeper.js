/* Compact sections + "Dive deeper" modal. Content is moved (not copied) into a
   native <dialog> per section, so nothing is lost and no-JS readers see the full page. */
(function(){
  var css=`
.dd-sum{margin:.6rem 0 0}
.dd-sum .dd-line{margin:.35rem 0;font-size:1.02rem}
.dd-sum ol{margin:.5rem 0 0;padding-left:1.4rem}.dd-sum li{margin:.3rem 0}
.kp-take{margin:.45rem 0 .2rem;padding:.55rem .8rem;border-left:3px solid #d4af37;background:rgba(212,175,55,.07);border-radius:0 8px 8px 0;font-size:.95rem}.kp-take p{margin:.2rem 0}.kp-take b{color:inherit;font-weight:700}
.dd-sum li .tag{margin-left:.45rem;vertical-align:middle}
.dd-btn{margin:.85rem 0 .3rem;display:inline-flex;align-items:center;gap:.45rem;cursor:pointer;font:600 .78rem/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#0b0b0b;background:#d4af37;border:0;border-radius:999px;padding:.7rem 1.1rem;transition:transform .15s,filter .15s}
.dd-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}.dd-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
dialog.dd{width:min(760px,94vw);max-height:88vh;padding:0;border:1px solid #d4af37;border-radius:14px;background:#111;color:#ede4cf;box-shadow:0 20px 60px rgba(0,0,0,.6)}
dialog.dd[open]{animation:ddIn .22s ease-out}dialog.dd::backdrop{background:rgba(0,0,0,.7);backdrop-filter:blur(2px)}
@keyframes ddIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.dd-head{position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.9rem 1.1rem;background:#111;border-bottom:1px solid rgba(212,175,55,.35)}
.dd-head h2{margin:0;font-size:1.15rem;color:#d4af37}
.dd-x{flex:none;width:2.4rem;height:2.4rem;border-radius:50%;border:1px solid #d4af37;background:transparent;color:#d4af37;font-size:1.3rem;cursor:pointer}
.dd-body{padding:.4rem 1.2rem 1.4rem;overflow:auto}
.dd-body figure{max-width:100%;overflow-x:auto}
dialog.dd{--bg:#14110c;--panel:#1d1a13;--fg:#ece4d2;--text:#ece4d2;--muted:#c2b8a3;--line:#3a3326;--good:#9bd69b;--warn:#e8c56e;--fire:#f29a72;--gold:#e0bc4a;--gold-soft:#8a6f2a;--blue:#8fd8fb;--card:#1a1814}
dialog.dd .dd-body{font-size:1.02rem;line-height:1.6}
dialog.dd .dd-body a{color:#f0cf6a}
.tag{font-size:.78rem!important;padding:.15rem .55rem!important;font-weight:700}
dialog.dd .tag.t{color:#b6e37a!important;border-color:#8cc63f!important;background:rgba(140,198,63,.16)!important}
dialog.dd .tag.r{color:#f3d98a!important;border-color:#d4af37!important;background:rgba(212,175,55,.16)!important}
dialog.dd .tag.y{color:#f7b08f!important;border-color:#f29a72!important;background:rgba(242,154,114,.14)!important}
dialog.dd .vs,dialog.dd .vs a{font-size:.95rem!important;color:#8fd8fb!important;letter-spacing:.08em!important}
dialog.dd .kp-take b{color:#f0cf6a}
@media (max-width:640px){dialog.dd{width:100vw;max-width:100vw;max-height:92vh;margin:auto 0 0;border-radius:14px 14px 0 0}}
@media (prefers-reduced-motion:reduce){dialog.dd[open]{animation:none}}`;
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  if(!window.HTMLDialogElement)return; // old browsers keep the full page
  var n=0,last=null;
  function firstSentence(t){t=t.replace(/\s+/g,' ').trim();var m=t.match(/^.+?[.!?](\s|$)/);return m?m[0].trim():t}
  function build(h2,nodes,keep){
    var id='dd'+(++n),items=[],lead=null;
    nodes.forEach(function(el){
      if(el.querySelectorAll)[].forEach.call(el.matches&&el.matches('article')?[el]:el.querySelectorAll('article'),function(a){items.push(a)});
      if(!lead&&el.tagName==='P'&&!keep(el))lead=el;
    });
    var sum=document.createElement('div');sum.className='dd-sum';
    if(items.length){var ol=document.createElement('ol');items.forEach(function(a){var h=a.querySelector('h3');if(!h)return;var li=document.createElement('li');li.innerHTML=h.innerHTML;var tg=a.querySelector('.tag');if(tg)li.appendChild(tg.cloneNode(true));var tk=a.querySelector('.kp-take');if(tk)li.appendChild(tk.cloneNode(true));ol.appendChild(li)});sum.appendChild(ol)}
    else if(lead){var p=document.createElement('p');p.className='dd-line';p.textContent=firstSentence(lead.textContent);sum.appendChild(p)}
    var btn=document.createElement('button');btn.type='button';btn.className='dd-btn';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-controls',id);btn.innerHTML='Dive deeper <span aria-hidden="true">&rarr;</span>';
    var dlg=document.createElement('dialog');dlg.className='dd';dlg.id=id;dlg.setAttribute('aria-labelledby',id+'-t');
    dlg.innerHTML='<div class="dd-head"><h2 id="'+id+'-t"></h2><button type="button" class="dd-x" aria-label="Close">&times;</button></div><div class="dd-body"></div>';
    dlg.querySelector('h2').textContent=h2.textContent.replace(/^\s*\d+\s*/,'');
    var body=dlg.querySelector('.dd-body');
    var anchor=nodes.filter(keep).pop()||h2;
    nodes.forEach(function(el){if(!keep(el))body.appendChild(el)});
    anchor.after(sum);sum.after(btn);btn.after(dlg);
    btn.addEventListener('click',function(){last=btn;dlg.showModal();dlg.querySelector('.dd-x').focus()});
    dlg.querySelector('.dd-x').addEventListener('click',function(){dlg.close()});
    dlg.addEventListener('click',function(e){var r=dlg.getBoundingClientRect();if(e.target===dlg&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dlg.close()});
    dlg.addEventListener('close',function(){if(last)last.focus()});
    // focus trap (showModal already makes the page inert; this keeps Tab cycling inside)
    dlg.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var f=dlg.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');if(!f.length)return;var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
  }
  // Chapter pages: section = h2 up to the next h2 or <hr>
  [].forEach.call(document.querySelectorAll('section[id^="chap-"] > h2'),function(h2){
    var nodes=[],el=h2.nextElementSibling;
    while(el&&el.tagName!=='H2'&&el.tagName!=='HR'){nodes.push(el);el=el.nextElementSibling}
    // Only sections with deeper material (key points + cross-references) get a button
    if(!nodes.some(function(x){return x.querySelector&&x.querySelector('article.kp-item')}))return;
    build(h2,nodes,function(x){return x.matches('p.ref')});
  });
  // Key Points page: each theme row
  [].forEach.call(document.querySelectorAll('section.grp > h2'),function(h2){
    var nodes=[],el=h2.nextElementSibling;
    while(el){nodes.push(el);el=el.nextElementSibling}
    build(h2,nodes,function(x){return x.matches('p.flow')||x.matches('p.top-link')});
  });
  // Deep links (#g1-06a) open the modal that now holds the target
  function openHash(){var t=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));var d=t&&t.closest&&t.closest('dialog.dd');if(d&&!d.open){d.showModal();t.scrollIntoView()}}
  openHash();window.addEventListener('hashchange',openHash);
})();
