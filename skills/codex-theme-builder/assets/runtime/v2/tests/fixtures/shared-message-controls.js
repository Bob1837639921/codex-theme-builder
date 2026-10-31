(()=>{
 const frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:-10000px;top:0;width:600px;height:400px';document.body.append(frame);
 try{
  const doc=frame.contentDocument,root=doc.documentElement;
  const shared=doc.createElement('style');shared.textContent=document.getElementById('codex-dream-skin-base-style').textContent;doc.head.append(shared);
  const custom=doc.createElement('style');doc.head.append(custom);
  doc.body.innerHTML='<main class="dream-conversation-shell"><button id="action" class="dream-message-action"><svg width="16" height="16"><path fill="currentColor" d="M0 0h16v16H0z"/></svg></button><form class="dream-message-editor"><div id="editor" role="textbox" aria-label="Edit message">Draft</div><button id="cancel" type="button">Cancel</button><button id="submit" type="submit" class="bg-primary-solid"><span>Submit</span></button></form></main>';
  const sample=()=>{
   const css=n=>{const s=frame.contentWindow.getComputedStyle(n);return {color:s.color,fill:s.webkitTextFillColor,bg:s.backgroundColor}};
   return {action:css(doc.getElementById('action')),icon:css(doc.querySelector('#action svg')),editor:css(doc.getElementById('editor')),cancel:css(doc.getElementById('cancel')),submit:css(doc.getElementById('submit')),surface:css(doc.querySelector('form'))};
  };
  root.className='codex-dream-skin';root.dataset.dreamColorScheme='dark';
  const dark=sample();
  if(dark.action.color!=='rgb(204, 238, 250)'||dark.submit.color!=='rgb(8, 35, 49)'||dark.submit.bg!=='rgb(142, 213, 232)')throw Error('Shared dark fallback is not applied: '+JSON.stringify(dark));
  custom.textContent=':root.codex-dream-skin{--theme-message-action-ink:#ffd88a;--theme-message-editor-ink:#fce8ff;--theme-message-editor-surface:#301b33;--theme-message-editor-primary-surface:#26421a;--theme-message-editor-primary-ink:#efffd8}';
  const customized=sample();
  if(customized.action.color!=='rgb(255, 216, 138)'||customized.submit.color!=='rgb(239, 255, 216)'||customized.submit.bg!=='rgb(38, 66, 26)'||customized.surface.bg!=='rgb(48, 27, 51)')throw Error('Custom palette was overwritten');
  custom.textContent+=':root.codex-dream-skin{--theme-message-action-hover-ink:#ffeeb1;--theme-message-action-hover-surface:#36512f}';
  doc.getElementById('action').dataset.state='open';
  const hover=sample();
  if(hover.action.color!=='rgb(255, 238, 177)'||hover.icon.color!==hover.action.color||hover.action.bg!=='rgb(54, 81, 47)')throw Error('Custom active/hover palette must reach the icon');
  delete doc.getElementById('action').dataset.state;
  custom.textContent='';root.dataset.dreamColorScheme='light';
  const light=sample();
  if(light.action.color==='rgb(204, 238, 250)'||light.submit.bg==='rgb(142, 213, 232)')throw Error('Dark fallback leaked into a light theme');
  root.className='';const native=sample();
  if(frame.contentWindow.getComputedStyle(root).getPropertyValue('--theme-message-editor-ink').trim())throw Error('Theme tokens leaked into native mode');
  return {dark,customized,hover,light,native,pass:true};
 }finally{frame.remove()}
})()
