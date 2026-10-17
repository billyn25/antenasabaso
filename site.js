(()=>{
  const key='antenas-abaso-cookie-info-v1';
  const notice=document.querySelector('[data-cookie-notice]');
  if(!notice) return;
  let dismissed=false;
  try{ dismissed=localStorage.getItem(key)==='hidden'; }catch{}
  if(!dismissed) notice.hidden=false;
  const button=notice.querySelector('[data-cookie-dismiss]');
  if(!button) return;
  button.addEventListener('click',()=>{
    notice.hidden=true;
    try{ localStorage.setItem(key,'hidden'); }catch{}
  });
})();

(()=>{
  const button=document.querySelector('[data-menu-toggle]');
  if(!button || typeof button.closest!=='function') return;
  const header=button.closest('.site-header');
  const nav=header?.querySelector('#site-navigation');
  if(!nav) return;
  const setOpen=open=>{
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
    header.dataset.menuOpen=String(open);
  };
  header.dataset.mobileNav='ready';
  setOpen(false);
  button.addEventListener('click',()=>setOpen(button.getAttribute('aria-expanded')!=='true'));
  nav.addEventListener('click',event=>{
    if(event.target.closest('a')) setOpen(false);
  });
  header.addEventListener('keydown',event=>{
    if(event.key==='Escape' && button.getAttribute('aria-expanded')==='true'){
      setOpen(false);
      button.focus({preventScroll:true});
    }
  });
})();
