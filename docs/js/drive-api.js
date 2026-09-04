(function(g){
  const cfg=()=>g.RT_APP_CONFIG||{};
  const dataUrlParts=(dataUrl)=>{
    const m=String(dataUrl||'').match(/^data:([^;]+);base64,(.+)$/);
    if(!m) throw new Error('Format file tidak valid.');
    return {mimeType:m[1],base64:m[2]};
  };
  function url_(){const url=cfg().APPS_SCRIPT_URL;if(!url||url.includes('PASTE_'))throw new Error('APPS_SCRIPT_URL belum diisi di js/firebase-config.js');return url}
  async function fetchPost_(body){
    const r=await fetch(url_(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'});
    const text=await r.text();let out;try{out=JSON.parse(text)}catch(e){throw new Error('NON_JSON')}
    if(!r.ok||!out.ok)throw new Error(out.error||('Apps Script HTTP '+r.status));return out;
  }
  function iframePost_(body){
    return new Promise((resolve,reject)=>{
      const callbackId='rtv6_'+Date.now()+'_'+Math.random().toString(36).slice(2),frame=document.createElement('iframe'),form=document.createElement('form'),field=document.createElement('textarea');
      frame.name=callbackId;frame.style.display='none';form.style.display='none';form.method='POST';form.action=url_();form.target=callbackId;field.name='payload';field.value=JSON.stringify({...body,transport:'iframe',callbackId});form.appendChild(field);document.body.append(frame,form);
      let timer=setTimeout(()=>done(new Error('Timeout upload Google Drive.')),90000);
      const onMessage=e=>{const d=e.data;if(!d||d.__rtV6Callback!==callbackId)return;const r=d.response||{};if(r.ok)done(null,r);else done(new Error(r.error||'Apps Script gagal.'))};
      function done(err,val){clearTimeout(timer);window.removeEventListener('message',onMessage);setTimeout(()=>{frame.remove();form.remove()},100);err?reject(err):resolve(val)}
      window.addEventListener('message',onMessage);form.submit();
    });
  }
  async function post(action,payload={},idToken=''){
    // V6 sengaja memakai hidden-iframe POST agar GitHub Pages dapat memanggil Apps Script tanpa CORS proxy/Cloudflare.
    return iframePost_({action,payload,idToken});
  }
  async function uploadDataUrl({dataUrl,fileName,category,subfolder='',visibility='PRIVATE',idToken}){
    const p=dataUrlParts(dataUrl);return post('drive.upload',{...p,fileName,category,subfolder,visibility},idToken);
  }
  async function uploadFile(file,opts={}){
    const dataUrl=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(file)});
    return uploadDataUrl({dataUrl,fileName:file.name,...opts});
  }
  g.RTDriveApi={post,uploadDataUrl,uploadFile,dataUrlParts};
})(window);
