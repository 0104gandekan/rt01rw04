function doGet(e){
  return json_({ok:true,service:'RT01 RW04 V6 Drive & PDF Service',version:V6_VERSION,time:new Date().toISOString()});
}

function doPost(e){
  let body={};
  try{
    if(e&&e.parameter&&e.parameter.payload) body=JSON.parse(e.parameter.payload);
    else body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const action=String(body.action||'');
    if(action==='health') return respond_(body,deploymentStatus());
    const actor=verifyFirebaseUser_(String(body.idToken||''));
    const p=body.payload||{};
    const routes={
      'drive.upload':()=>uploadDriveFile_(p,actor),
      'pdf.letter':()=>generateLetterPdf_(p,actor),
      'pdf.loan':()=>generateLoanPdf_(p,actor),
      'pdf.report':()=>generateReportPdf_(p,actor),
      'push.send':()=>sendPush_(p,actor)
    };
    if(!routes[action]) throw new Error('Action tidak dikenal: '+action);
    return respond_(body,routes[action]());
  }catch(err){
    return respond_(body,{ok:false,error:String(err&&err.message?err.message:err)});
  }
}

function respond_(body,o){
  if(body&&body.transport==='iframe'&&body.callbackId){
    const packet=JSON.stringify({__rtV6Callback:String(body.callbackId),response:o}).replace(/</g,'\\u003c');
    return HtmlService.createHtmlOutput('<!doctype html><html><body><script>parent.postMessage('+packet+',"*");</script></body></html>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return json_(o);
}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function requireAdmin_(actor){if(!actor||!actor.active||!['ADMIN','SUPER_ADMIN'].includes(String(actor.role||'').toUpperCase()))throw new Error('Akses admin ditolak.');return actor}
