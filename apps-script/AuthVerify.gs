function verifyFirebaseUser_(idToken){
  if(!idToken) throw new Error('Firebase ID token tidak ada. Silakan login ulang.');
  const props=PropertiesService.getScriptProperties(),apiKey=props.getProperty(PROP.FIREBASE_WEB_API_KEY),projectId=props.getProperty(PROP.FIREBASE_PROJECT_ID);
  if(!apiKey||!projectId) throw new Error('Apps Script belum dikonfigurasi. Jalankan setupV6().');
  const r=UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(apiKey),{method:'post',contentType:'application/json',payload:JSON.stringify({idToken:idToken}),muteHttpExceptions:true});
  if(r.getResponseCode()!==200) throw new Error('Token Firebase tidak valid atau kedaluwarsa.');
  const data=JSON.parse(r.getContentText()),u=data.users&&data.users[0];if(!u||!u.localId)throw new Error('Pengguna Firebase tidak ditemukan.');
  const roleDoc=fetchFirestoreUser_(projectId,u.localId,idToken);
  const status=String(roleDoc.status||'').toUpperCase(),role=String(roleDoc.role||'WARGA').toUpperCase();
  return {uid:u.localId,email:u.email||'',emailVerified:!!u.emailVerified,role:role,status:status,active:status==='AKTIF',profile:roleDoc};
}
function fetchFirestoreUser_(projectId,uid,idToken){
  const url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(projectId)+'/databases/(default)/documents/users/'+encodeURIComponent(uid);
  const r=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+idToken},muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw new Error('Profil Firestore pengguna tidak dapat diverifikasi.');
  const d=JSON.parse(r.getContentText());return firestoreFields_(d.fields||{});
}
function firestoreFields_(fields){const o={};Object.keys(fields||{}).forEach(k=>o[k]=firestoreValue_(fields[k]));return o}
function firestoreValue_(v){
  if(v.stringValue!==undefined)return v.stringValue;if(v.booleanValue!==undefined)return v.booleanValue;
  if(v.integerValue!==undefined)return Number(v.integerValue);if(v.doubleValue!==undefined)return Number(v.doubleValue);
  if(v.timestampValue!==undefined)return v.timestampValue;if(v.nullValue!==undefined)return null;
  if(v.arrayValue)return (v.arrayValue.values||[]).map(firestoreValue_);if(v.mapValue)return firestoreFields_(v.mapValue.fields||{});return '';
}
