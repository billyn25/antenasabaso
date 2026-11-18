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

/* Consulta local de frecuencias. Las tablas completas permanecen visibles. */
(()=>{
  if(typeof document.querySelectorAll!=='function') return;
  document.querySelectorAll('[data-tdt-finder]').forEach(form=>{
    if(typeof form.closest!=='function' || typeof form.addEventListener!=='function') return;
    const section=form.closest('.local-reception');
    if(!section || typeof section.querySelectorAll!=='function') return;
    const select=form.querySelector('select');
    const result=form.querySelector('[data-tdt-result]');
    const rows=[...section.querySelectorAll('[data-tdt-mux]')];
    if(!select || !result || !rows.length) return;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const mux=select.value;
      const matches=rows.filter(row=>row.dataset.tdtMux===mux);
      rows.forEach(row=>row.classList.toggle('tdt-selected',mux!=='' && matches.includes(row)));
      if(!mux || !matches.length){
        result.textContent='Selecciona una cadena para consultar su frecuencia.';
        return;
      }
      const frequencies=matches.map(row=>{
        const uhf=Number(row.dataset.tdtUhf),mhz=Number(row.dataset.tdtMhz);
        if(!Number.isInteger(uhf) || uhf<21 || uhf>48 || !Number.isFinite(mhz)) return '';
        return `${row.dataset.tdtZone}: UHF ${uhf} (${mhz} MHz)`;
      }).filter(Boolean);
      if(!frequencies.length){
        result.textContent='Consulta la fila de '+mux+' en la tabla de frecuencias.';
        return;
      }
      const channel=String(select.selectedOptions?.[0]?.textContent||mux).trim();
      const compatibility=mux==='RGE2'?' Para UHD necesitas un receptor compatible con DVB-T2 y HEVC/H.265.':'';
      result.textContent=`${channel} · ${mux}. ${frequencies.join('; ')}. Usa el canal UHF en la búsqueda manual de Antena/TDT.${compatibility} La recepción depende del repetidor.`;
    });
    form.hidden=false;
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


/* Formulario de presupuesto: prepara el mensaje y abre WhatsApp. No envía datos a la web. */
(()=>{
  const form=document.querySelector('[data-budget-form]');
  if(!form || typeof form.addEventListener!=='function') return;
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const service=String(data.get('service')||'').trim();
    const province=String(data.get('province')||'').trim();
    const town=String(data.get('town')||'').trim();
    const property=String(data.get('property')||'').trim();
    const problem=String(data.get('problem')||'').trim().slice(0,600);
    if(!service||!province||!town||!problem) return;
    const message=[
      'Hola, quiero pedir presupuesto con Antenas Abaso.',
      '',
      'Servicio: '+service,
      'Provincia: '+province,
      'Municipio: '+town,
      'Inmueble: '+property,
      'Problema: '+problem,
      '',
      'Si hace falta, puedo adjuntar una foto del equipo.'
    ].join('\n');
    window.location.href='https://wa.me/34670042626?text='+encodeURIComponent(message);
  });
  form.hidden=false;
})();


/* Accesos de portada: preparan el servicio y, cuando se indica, el tipo de inmueble. */
(()=>{
  const form=document.querySelector('[data-budget-form]');
  if(!form || typeof form.querySelector!=='function') return;
  const service=form.querySelector('[name="service"]');
  const property=form.querySelector('[name="property"]');
  if(!service) return;
  if(typeof document.querySelectorAll!=='function') return;
  document.querySelectorAll('[data-home-service]').forEach(link=>{
    if(typeof link.addEventListener!=='function') return;
    link.addEventListener('click',()=>{
      const value=link.getAttribute('data-home-service');
      if(value) service.value=value;
      const propertyValue=link.getAttribute('data-home-property');
      if(property && propertyValue) property.value=propertyValue;
    });
  });
})();
