"""Validate public layout: no horizontal or vertical collisions, CSS and contacts."""
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('reports/guide-browser');out.mkdir(parents=True,exist_ok=True)
origin='https://antenasabaso.com'
routes=['/', '/bizkaia/', '/burgos/', '/bizkaia/balmaseda/', '/bizkaia/zalla/', '/burgos/lerma/', '/servicios/']
guides=json.loads(Path('content/service-guides.json').read_text())
routes += ['/servicios/'+g['slug']+'/' for g in guides]
result={'origin':origin,'commit':os.environ.get('GITHUB_SHA'),'checks':[],'ok':False}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  for width,js in [(320,True),(390,True),(768,True),(1440,True),(390,False)]:
   context=browser.new_context(viewport={'width':width,'height':1000},java_script_enabled=js)
   page=context.new_page()
   for route in routes:
    page.goto(origin+route,wait_until='load',timeout=45000)
    page.locator('link[href*="abaso-guides."]').wait_for(state='attached')
    assert page.locator('h1').count()==1,route
    assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth+1'),(route,width)
    boxes=page.evaluate('''()=>[...document.querySelectorAll('.abaso-guide-links,.abaso-guide-catalogue,.abaso-guide-toc')].map(el=>({box:el.getBoundingClientRect().toJSON(),children:[...el.children].map(c=>c.getBoundingClientRect().toJSON())}))''')
    for grid in boxes:
     box=grid['box'];children=grid['children']
     for child in children:
      assert child['left']>=box['left']-1 and child['right']<=box['right']+1,(route,width,'width containment')
      assert child['top']>=box['top']-1 and child['bottom']<=box['bottom']+1,(route,width,'height containment')
     for i,a in enumerate(children):
      for b in children[i+1:]:assert min(a['right'],b['right'])-max(a['left'],b['left'])<=1 or min(a['bottom'],b['bottom'])-max(a['top'],b['top'])<=1,(route,width,'overlap')
    assert page.locator('a[href="tel:+34670042626"]').count()>0
    if route in ['/bizkaia/balmaseda/','/bizkaia/zalla/','/burgos/lerma/']:
     assert page.locator('.service-card .abaso-guide-link').count()==6
     assert page.locator('.services h2').inner_text().startswith('Antenas, porteros y otros servicios en ')
    if route.startswith('/servicios/') and route!='/servicios/':
     assert page.locator('.abaso-guide-faq details').count()==3
     faq=page.locator('.abaso-guide-faq details').first
     faq.locator('summary').click();assert faq.locator('p').is_visible()
    result['checks'].append({'route':route,'width':width,'javascript':js,'noOverflow':True,'noOverlap':True,'phoneCorrect':True})
    if js and width in [390,1440] and route in ['/servicios/reparacion-antenas-tdt/','/servicios/porteros-automaticos/']:
     page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/(route.strip('/').replace('/','-')+'-'+str(width)+'.png')))
    if js and width in [390,1440] and route=='/bizkaia/balmaseda/':page.locator('.services').screenshot(path=str(out/('balmaseda-servicios-'+str(width)+'.png')))
   context.close()
  browser.close()
 result['ok']=True
 print('GUÍAS NAVEGADOR OK:',len(result['checks']),'comprobaciones publicadas')
finally:
 (out/'checks.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
