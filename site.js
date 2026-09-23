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
