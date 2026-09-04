(function(g){
'use strict';

const SHEET_COLLECTION={
  WARGA:'warga', WARGA_AKUN:'users', RONDA_JADWAL:'ronda', RONDA_PETUGAS:'rondaPetugas', RONDA_TUKAR_JAGA:'rondaTukar',
  POSYANDU:'posyandu', KEUANGAN:'keuangan', ASSET:'assets', PEMINJAMAN:'loans', ADUAN:'complaints', KEGIATAN:'kegiatan',
  PENGUMUMAN:'pengumuman', LAYANAN_SURAT:'suratRequests', KRITIK_SARAN:'feedback', DOKUMEN:'documents', SURAT:'surat',
  LAPORAN_BULANAN:'laporanBulanan', RONDA_LAPORAN:'rondaLaporan'
};
const ADMIN_ROLES=['ADMIN','SUPER_ADMIN'];
let app,auth,db,messaging=null,ready=false,currentProfile=null,unsubs=[];
const cfg=()=>g.RT_APP_CONFIG||{};

function defaultConfig(){return {
  APP_NAME:'RT 01 RW 04 Digital',APP_SUBTITLE:'Dusun II Desa Pegandekan',TAGLINE:'Guyub • Rukun • Aman',RT_NAME:'RT 01 RW 04',
  ADDRESS:'Dusun II, Desa Pegandekan, Kecamatan Kemangkon, Kabupaten Purbalingga, Jawa Tengah',PHONE:'',SECRETARIAT:'Sekretariat RT 01 RW 04 Dusun II Pegandekan',EMERGENCY_PHONE:'112',
  DEFAULT_LAT:'-7.4538336',DEFAULT_LNG:'109.3571752',HERO_IMAGE:'https://png.pngtree.com/thumb_back/fh260/background/20241224/pngtree-peaceful-countryside-scene-with-rice-paddies-and-palm-trees-image_16861484.jpg',
  PRAYER_HERO:'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80',RONDA_PETUGAS_PER_SHIFT:'5',
  KETUA_RT:'Imam Abdilah',SEKRETARIS:'Mutirah',BENDAHARA:'Narsiti',KEPALA_DUSUN:'Sigit Prosetyo',KETUA_RW:'Tohirin',BPD:'Suwandi',KAUR_PERENCANAAN:'Hadimin',
  PHOTO_KETUA_URL:'',PHOTO_SEKRETARIS_URL:'',PHOTO_BENDAHARA_URL:'',
  FINANCE_INCOME_CATEGORIES:'Iuran Warga\nKas Warga\nDonasi\nSewa Aset\nSumbangan\nLainnya',FINANCE_EXPENSE_CATEGORIES:'Listrik\nATK\nKegiatan\nPemeliharaan\nSosial\nKonsumsi\nLainnya',
  LETTER_ORG_NAME:'PENGURUS RT 01 RW 04',LETTER_ORG_SUBTITLE:'DUSUN II DESA PEGANDEKAN',LETTER_ADDRESS:'Kecamatan Kemangkon, Kabupaten Purbalingga, Jawa Tengah',LETTER_CITY:'Pegandekan',LETTER_NUMBER_PREFIX:'RT01/RW04',LETTER_FOOTER:'Dokumen diterbitkan oleh Pengurus RT 01 RW 04 Dusun II Pegandekan.',
  REPORT_FINANCE_TITLE:'LAPORAN KEUANGAN BULANAN',REPORT_INVENTORY_TITLE:'LAPORAN INVENTARIS BULANAN',LETTER_LOGO_URL:'',SIGN_KETUA_URL:'',SIGN_BENDAHARA_URL:''
}}
function defaultBundle(){return {ok:true,version:'6.1.2',config:defaultConfig(),finance:{pemasukan:0,pengeluaran:0,saldo:0},financeTransactions:[],rondaToday:{},rondaWeek:[],posyandu:[],kegiatan:[],assets:[],aduanTerbaru:[],pengumuman:[],documents:[],notifications:[],serverTime:new Date().toISOString()}}
function isConfigured(){const c=g.RT_FIREBASE_CONFIG||{};return !!c.apiKey && !String(c.apiKey).includes('PASTE_') && !!c.projectId && !String(c.projectId).includes('PASTE_')}
function plain(v){
  if(v==null)return v;
  if(v && typeof v.toDate==='function')return v.toDate().toISOString();
  if(Array.isArray(v))return v.map(plain);
  if(typeof v==='object'){const o={};Object.keys(v).forEach(k=>o[k]=plain(v[k]));return o}
  return v;
}
function cleanRecord(o){const r={};Object.entries(o||{}).forEach(([k,v])=>{if(v!==undefined)r[k]=v});return r}
function docRow(doc){return {ID:doc.id,...plain(doc.data())}}
function nowIso(){return new Date().toISOString()}
function normalizeDate(v){if(!v)return '';if(v?.toDate)return v.toDate().toISOString().slice(0,10);return String(v).slice(0,10)}
function sortDate(rows,key='Tanggal',desc=false){return rows.sort((a,b)=>String(a[key]||'').localeCompare(String(b[key]||''))*(desc?-1:1))}
function randomId(prefix='ID'){return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
function cacheBundle(bundle){try{localStorage.setItem(cfg().PUBLIC_CACHE_KEY||'rt01-v61-public-cache',JSON.stringify({at:Date.now(),bundle}))}catch(e){}}
function cachedBundle(){try{const x=JSON.parse(localStorage.getItem(cfg().PUBLIC_CACHE_KEY||'rt01-v61-public-cache')||'null');return x?.bundle||null}catch(e){return null}}

async function init(){
  if(ready)return;
  if(!isConfigured()) throw new Error('Firebase belum dikonfigurasi. Isi docs/js/firebase-config.js terlebih dahulu.');
  if(!g.firebase) throw new Error('Firebase SDK gagal dimuat.');
  app=firebase.apps.length?firebase.app():firebase.initializeApp(g.RT_FIREBASE_CONFIG);
  auth=firebase.auth();db=firebase.firestore();
  try{await db.enablePersistence({synchronizeTabs:true})}catch(e){if(!['failed-precondition','unimplemented'].includes(e.code))console.warn('Firestore persistence:',e)}
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  if(firebase.messaging && firebase.messaging.isSupported?.()){try{messaging=firebase.messaging()}catch(e){}}
  await new Promise(resolve=>{const stop=auth.onAuthStateChanged(async u=>{if(u){try{currentProfile=await profileFor(u.uid)}catch(e){currentProfile=null}}else currentProfile=null;stop();resolve()})});
  ready=true;
}
async function profileFor(uid){const s=await db.collection('users').doc(uid).get();return s.exists?{id:s.id,...plain(s.data())}:null}
async function idToken(force=false){if(!auth?.currentUser)throw new Error('Silakan login terlebih dahulu.');return auth.currentUser.getIdToken(force)}
function isAdminProfile(p=currentProfile){return !!p && ADMIN_ROLES.includes(String(p.role||'').toUpperCase()) && String(p.status||'').toUpperCase()==='AKTIF'}
async function requireAdmin(){if(!isAdminProfile())throw new Error('Akses admin ditolak.');return currentProfile}
async function requireActiveUser(){if(!currentProfile || String(currentProfile.status||'').toUpperCase()!=='AKTIF')throw new Error('Akun belum aktif. Menunggu verifikasi admin.');return currentProfile}

async function allRows(collection){const s=await db.collection(collection).get();return s.docs.map(docRow)}
async function safeRows(collection){try{return await allRows(collection)}catch(e){console.warn('Koleksi '+collection+' belum dapat dibaca:',e.message);return []}}
async function queryRows(collection,field,op,value){const s=await db.collection(collection).where(field,op,value).get();return s.docs.map(docRow)}
async function settings(){const s=await db.collection('settings').doc('app').get();return {...defaultConfig(),...(s.exists?plain(s.data()):{})}}
async function publicBundle(){
  await init();
  const [c,fin,ronda,petugas,tukar,pos,keg,assets,peng,docs,notes,complaints]=await Promise.all([
    settings(),allRows('keuangan'),allRows('ronda'),allRows('rondaPetugas'),allRows('rondaTukar'),allRows('posyandu'),allRows('kegiatan'),allRows('assets'),allRows('pengumuman'),queryRows('documents','Publik','==',true),allRows('notifications'),safeRows('complaintPublic')
  ]);
  const masuk=fin.filter(x=>String(x.Jenis).toUpperCase()==='MASUK').reduce((a,b)=>a+Number(b.Nominal||0),0),keluar=fin.filter(x=>String(x.Jenis).toUpperCase()==='KELUAR').reduce((a,b)=>a+Number(b.Nominal||0),0);
  const max=Number(c.RONDA_PETUGAS_PER_SHIFT||5)||5;
  const rw=sortDate(ronda.filter(x=>String(x.Status||'AKTIF').toUpperCase()!=='NONAKTIF')).map(j=>{
    let ps=petugas.filter(p=>String(p.JadwalID)===String(j.ID)&&(p.Aktif===true||String(p.Aktif)==='true'||p.Aktif===undefined)).sort((a,b)=>Number(a.Urutan||0)-Number(b.Urutan||0)).map(p=>p.Nama);
    const swaps=tukar.filter(s=>(String(s.JadwalID)===String(j.ID)||normalizeDate(s.Tanggal)===normalizeDate(j.Tanggal))&&['AKTIF','DISETUJUI'].includes(String(s.Status||'').toUpperCase()));
    swaps.forEach(s=>{const i=ps.findIndex(n=>String(n).toLowerCase()===String(s.PetugasAwal||'').toLowerCase());if(i>=0)ps[i]=s.PetugasPengganti});
    return {...j,Petugas:ps.slice(0,max),TukarJaga:swaps,PetugasPerShift:max};
  });
  const today=new Date().toISOString().slice(0,10),rondaToday=rw.find(x=>normalizeDate(x.Tanggal)===today)||rw.find(x=>normalizeDate(x.Tanggal)>=today)||rw[0]||{};
  const active=(x)=>x.Aktif===undefined||x.Aktif===true||String(x.Aktif)==='true';
  const bundle={ok:true,version:'6.1.2',config:c,finance:{pemasukan:masuk,pengeluaran:keluar,saldo:masuk-keluar},financeTransactions:sortDate(fin,'Tanggal',true).slice(0,15),rondaToday,rondaWeek:rw,posyandu:pos.filter(active),kegiatan:sortDate(keg.filter(active)),assets:assets.filter(x=>String(x.Status||'AKTIF').toUpperCase()!=='NONAKTIF'),aduanTerbaru:sortDate(complaints,'Tanggal',true).slice(0,12),pengumuman:sortDate(peng.filter(active),'TanggalMulai',true),documents:sortDate(docs.filter(x=>x.Publik===true||String(x.Publik)==='true'),'Tanggal',true),notifications:sortDate(notes.filter(active),'createdAt',true).slice(0,30),serverTime:nowIso()};
  cacheBundle(bundle);return bundle;
}

async function registerUser(p){
  await init();
  if(!/^\d{16}$/.test(String(p.nik||'')))throw new Error('NIK harus 16 digit.');
  if(String(p.password||'').length<8)throw new Error('Password minimal 8 karakter.');
  const cred=await auth.createUserWithEmailAndPassword(String(p.email||'').trim().toLowerCase(),p.password);
  await cred.user.updateProfile({displayName:p.nama||'Warga'}).catch(()=>{});
  await cred.user.sendEmailVerification().catch(()=>{});
  const row={uid:cred.user.uid,nik:String(p.nik),nama:p.nama,email:cred.user.email,noHP:p.noHP||'',role:'WARGA',status:'MENUNGGU',createdAt:nowIso(),updatedAt:nowIso(),catatan:'Menunggu verifikasi pengurus'};
  await db.collection('users').doc(cred.user.uid).set(row);
  await auth.signOut();currentProfile=null;
  return {ok:true,message:'Registrasi berhasil. Verifikasi email Anda, lalu tunggu persetujuan admin.'};
}
async function loginUser(email,password,adminOnly=false){
  await init();const cred=await auth.signInWithEmailAndPassword(String(email||'').trim().toLowerCase(),password);
  if(!cred.user.emailVerified){await cred.user.sendEmailVerification().catch(()=>{});await auth.signOut();throw new Error('Email belum diverifikasi. Tautan verifikasi sudah dikirim ulang.');}
  currentProfile=await profileFor(cred.user.uid);
  if(!currentProfile){await auth.signOut();throw new Error('Profil akun belum tersedia di Firestore.');}
  if(String(currentProfile.status||'').toUpperCase()!=='AKTIF'){await auth.signOut();const st=currentProfile.status;currentProfile=null;throw new Error('Akun belum dapat digunakan. Status: '+(st||'MENUNGGU'));}
  if(adminOnly&&!isAdminProfile(currentProfile)){await auth.signOut();currentProfile=null;throw new Error('Akun ini bukan akun admin.');}
  await db.collection('users').doc(cred.user.uid).set({lastLogin:nowIso(),updatedAt:nowIso()},{merge:true});
  const token=await cred.user.getIdToken();return {ok:true,token,user:{...currentProfile,name:currentProfile.nama||currentProfile.name}};
}
async function me(){await init();if(!auth.currentUser)return {ok:false,user:null};currentProfile=await profileFor(auth.currentUser.uid);if(!currentProfile||String(currentProfile.status||'').toUpperCase()!=='AKTIF')throw new Error('Akun belum aktif.');return {ok:true,user:currentProfile,token:await auth.currentUser.getIdToken()}}
async function logout(){await init();await auth.signOut();currentProfile=null;return {ok:true}}
async function sendPasswordReset(email){await init();await auth.sendPasswordResetEmail(email);return {ok:true}}

async function adminList(sheet){await requireAdmin();const c=SHEET_COLLECTION[sheet];if(!c)throw new Error('Koleksi tidak dikenal: '+sheet);const rows=await allRows(c);if(sheet==='ADUAN')await Promise.all(rows.map(syncPublicComplaint));return {ok:true,rows:sheet==='KEUANGAN'?sortDate(rows,'Tanggal',true):rows}}
function notificationSpec(sheet,oldRow,newRow,isNew){
  if(sheet==='RONDA_JADWAL')return {category:'RONDA',title:isNew?'Jadwal Ronda Baru':'Jadwal Ronda Diperbarui',body:`${newRow.Hari||'Jadwal'} ${newRow.Tanggal||''} • ${newRow.JamMulai||''}-${newRow.JamSelesai||''}`,page:'ronda'};
  if(sheet==='RONDA_PETUGAS')return {category:'RONDA',title:'Petugas Ronda Diperbarui',body:`${newRow.Nama||'Petugas'} • Jadwal ${newRow.JadwalID||''}`,page:'ronda'};
  if(sheet==='RONDA_TUKAR_JAGA')return {category:'RONDA',title:'Tukar Jaga Ronda Diperbarui',body:`${newRow.PetugasAwal||''} → ${newRow.PetugasPengganti||''} • ${newRow.Tanggal||''}`,page:'ronda'};
  if(sheet==='POSYANDU')return {category:'POSYANDU',title:isNew?'Jadwal Posyandu Baru':'Jadwal Posyandu Diperbarui',body:`${newRow.Judul||newRow.Jenis||'Posyandu'} • ${newRow.Hari||''} ${newRow.Jam||''} • ${newRow.Lokasi||''}`,page:'posyandu'};
  if(sheet==='KEGIATAN')return {category:'KEGIATAN',title:isNew?'Kegiatan RT Baru':'Jadwal Kegiatan Diperbarui',body:`${newRow.Judul||'Kegiatan'} • ${newRow.Tanggal||''} ${newRow.Jam||''} • ${newRow.Lokasi||''}`,page:'activities'};
  return null;
}
function meaningfulChanged(sheet,a,b){const keys=sheet==='RONDA_JADWAL'?['Tanggal','Hari','JamMulai','JamSelesai','Koordinator','Status']:sheet==='RONDA_PETUGAS'?['JadwalID','Nama','Urutan','Aktif']:sheet==='RONDA_TUKAR_JAGA'?['JadwalID','Tanggal','PetugasAwal','PetugasPengganti','Status']:sheet==='POSYANDU'?['Jenis','Judul','Hari','MingguKe','Jam','Lokasi','LayananJson','Aktif']:sheet==='KEGIATAN'?['Kategori','Judul','Tanggal','Jam','Lokasi','Deskripsi','Aktif']:[];return !a||keys.some(k=>String(a?.[k]??'')!==String(b?.[k]??''))}
async function createNotification(spec){
  const id=randomId('NTF');const row={ID:id,...spec,createdAt:nowIso(),Aktif:true,createdBy:auth.currentUser?.uid||''};await db.collection('notifications').doc(id).set(row);
  try{await pushNotification(row)}catch(e){console.warn('Push notification:',e.message)}
  return row;
}
async function pushNotification(row){
  if(!isAdminProfile()||!g.RTDriveApi)return;
  const tokens=(await allRows('fcmTokens')).map(x=>x.token).filter(Boolean);if(!tokens.length)return;
  const token=await idToken();await RTDriveApi.post('push.send',{tokens,title:row.title,body:row.body,page:row.page,category:row.category,link:location.origin+location.pathname+'#'+(row.page||'notifications')},token);
}
function publicComplaintRow(row){return {ID:row.ID,Tanggal:row.Tanggal||row.createdAt||nowIso(),kategori:row.kategori||row.Kategori||'',judul:row.judul||row.Judul||'',deskripsi:row.deskripsi||row.Deskripsi||'',lokasi:row.lokasi||row.Lokasi||'',lat:Number(row.lat??row.Latitude),lng:Number(row.lng??row.Longitude),Status:row.Status||'BARU',Aktif:row.Aktif!==false,createdAt:row.createdAt||nowIso(),updatedAt:nowIso()}}
async function syncPublicComplaint(row){if(!row?.ID)return;const pub=cleanRecord(publicComplaintRow(row));if(!Number.isFinite(pub.lat))delete pub.lat;if(!Number.isFinite(pub.lng))delete pub.lng;await db.collection('complaintPublic').doc(String(row.ID)).set(pub,{merge:true})}
async function adminUpsert(sheet,record){
  await requireAdmin();const c=SHEET_COLLECTION[sheet];if(!c)throw new Error('Koleksi tidak dikenal: '+sheet);
  const id=record.ID||randomId(sheet.slice(0,3));const ref=db.collection(c).doc(id),snap=await ref.get(),old=snap.exists?docRow(snap):null;
  const row=cleanRecord({...record,ID:id,updatedAt:nowIso(),updatedBy:auth.currentUser.uid});if(!old)row.createdAt=nowIso();
  await ref.set(row,{merge:true});
  if(sheet==='ADUAN')await syncPublicComplaint({...old,...row});
  const spec=notificationSpec(sheet,old,row,!old);if(spec&&meaningfulChanged(sheet,old,row))await createNotification(spec);
  return {ok:true,row};
}
async function adminDelete(sheet,id){await requireAdmin();const c=SHEET_COLLECTION[sheet];if(!c)throw new Error('Koleksi tidak dikenal');await db.collection(c).doc(id).delete();if(sheet==='ADUAN')await db.collection('complaintPublic').doc(String(id)).delete().catch(()=>{});return {ok:true}}
async function saveConfig(c){await requireAdmin();await db.collection('settings').doc('app').set({...c,updatedAt:nowIso()},{merge:true});return {ok:true,config:await settings()}}
async function wargaAccounts(){await requireAdmin();const rows=await allRows('users');return {ok:true,rows:rows.filter(x=>String(x.role||'WARGA').toUpperCase()==='WARGA')}}
async function wargaStatus(id,status,catatan=''){await requireAdmin();const ref=db.collection('users').doc(id),s=await ref.get();if(!s.exists)throw new Error('Akun tidak ditemukan.');const u=docRow(s);await ref.set({status,catatan,updatedAt:nowIso(),verifiedBy:auth.currentUser.uid},{merge:true});if(status==='AKTIF'&&u.nik){const qs=await db.collection('warga').where('NIK','==',u.nik).limit(1).get();if(qs.empty){const wid=randomId('WRG');await db.collection('warga').doc(wid).set({ID:wid,NIK:u.nik,Nama:u.nama,NoHP:u.noHP||'',Email:u.email||'',Status:'AKTIF',uid:id,createdAt:nowIso()})}else{await qs.docs[0].ref.set({uid:id,Email:u.email||'',NoHP:u.noHP||''},{merge:true})}}return {ok:true}}

async function dashboard(){
  await requireAdmin();const [w,fin,loans,suratReq,complaints,keg]=await Promise.all([allRows('warga'),allRows('keuangan'),allRows('loans'),allRows('suratRequests'),allRows('complaints'),allRows('kegiatan')]);
  const now=new Date(),ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const monthFin=fin.filter(x=>normalizeDate(x.Tanggal).startsWith(ym));const pemasukan=monthFin.filter(x=>String(x.Jenis).toUpperCase()==='MASUK').reduce((a,b)=>a+Number(b.Nominal||0),0),pengeluaran=monthFin.filter(x=>String(x.Jenis).toUpperCase()==='KELUAR').reduce((a,b)=>a+Number(b.Nominal||0),0),saldo=fin.reduce((a,b)=>a+(String(b.Jenis).toUpperCase()==='MASUK'?1:-1)*Number(b.Nominal||0),0);
  const chart=[];for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,rows=fin.filter(x=>normalizeDate(x.Tanggal).startsWith(p));chart.push({label:d.toLocaleDateString('id-ID',{month:'short'}),masuk:rows.filter(x=>String(x.Jenis).toUpperCase()==='MASUK').reduce((a,b)=>a+Number(b.Nominal||0),0),keluar:rows.filter(x=>String(x.Jenis).toUpperCase()==='KELUAR').reduce((a,b)=>a+Number(b.Nominal||0),0)})}
  return {ok:true,user:{...currentProfile,name:currentProfile.nama||currentProfile.name||'Admin'},stats:{warga:w.length,pemasukan,pengeluaran,saldo},summary:{pinjaman:loans.filter(x=>String(x.Status).toUpperCase()==='MENUNGGU').length,surat:suratReq.filter(x=>String(x.Status).toUpperCase()==='MENUNGGU').length,aduan:complaints.filter(x=>['BARU','DIPROSES'].includes(String(x.Status).toUpperCase())).length,kegiatan:keg.length},chart,loans:sortDate(loans,'TanggalMulai',true).slice(0,5),transactions:sortDate(fin,'Tanggal',true).slice(0,5),kegiatan:sortDate(keg).slice(0,5)};
}

async function uploadDataUrl(dataUrl,category,fileName,visibility='PRIVATE',subfolder=''){
  await requireActiveUser();if(!g.RTDriveApi)throw new Error('Drive API belum dimuat.');const token=await idToken();const out=await RTDriveApi.uploadDataUrl({dataUrl,fileName,category,subfolder,visibility,idToken:token});return out.file;
}
async function submitComplaint(p){await requireActiveUser();const lat=Number(p.lat),lng=Number(p.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error('Titik lokasi peta wajib dipilih.');let foto='',fotoFileId='';if(p.fotoDataUrl){const f=await uploadDataUrl(p.fotoDataUrl,'Aduan','aduan-'+Date.now()+'.jpg','PRIVATE');foto=f.webViewUrl||'';fotoFileId=f.fileId||''}const id=randomId('ADU'),row={ID:id,Tanggal:nowIso(),uid:auth.currentUser.uid,nama:p.nama||currentProfile.nama,noHP:p.noHP||currentProfile.noHP||'',kategori:p.kategori||'',judul:p.judul||'',deskripsi:p.deskripsi||'',lokasi:p.lokasi||'',lat,lng,FotoUrl:foto,FotoFileId:fotoFileId,Status:'BARU',createdAt:nowIso()};await db.collection('complaints').doc(id).set(row);await syncPublicComplaint(row).catch(e=>console.warn('Ringkasan aduan publik belum tersinkron:',e.message));return {ok:true,id}}
async function submitFeedback(p){await requireActiveUser();const id=randomId('KRS');await db.collection('feedback').doc(id).set({ID:id,Tanggal:nowIso(),uid:auth.currentUser.uid,Nama:p.nama||currentProfile.nama,NoHP:p.noHP||currentProfile.noHP||'',Jenis:p.jenis||p.Jenis||'Saran',Pesan:p.pesan||p.Pesan||'',Rating:Number(p.rating||p.Rating||5),Status:'BARU',createdAt:nowIso()});return {ok:true}}
async function submitLetter(p){await requireActiveUser();let LampiranUrl='',LampiranFileId='';if(p.lampiranDataUrl){const f=await uploadDataUrl(p.lampiranDataUrl,'Warga',p.lampiranFileName||('lampiran-surat-'+Date.now()),'PRIVATE','Surat-Lampiran');LampiranUrl=f.webViewUrl||'';LampiranFileId=f.fileId||''}const id=randomId('LYN');await db.collection('suratRequests').doc(id).set({ID:id,Tanggal:nowIso(),uid:auth.currentUser.uid,Nama:p.nama||currentProfile.nama,NIK:p.nik||currentProfile.nik||'',NoHP:p.noHP||currentProfile.noHP||'',Alamat:p.alamat||currentProfile.alamat||'',TempatLahir:p.tempatLahir||'',TanggalLahir:p.tanggalLahir||'',JenisKelamin:p.jenisKelamin||'',Agama:p.agama||'',JenisSurat:p.jenisSurat||'',Keperluan:p.keperluan||'',Keterangan:p.keterangan||'',LampiranUrl,LampiranFileId,Status:'MENUNGGU',createdAt:nowIso()});return {ok:true}}
async function submitLoan(p){
  await requireActiveUser();
  const requested=Array.isArray(p.items)?p.items:[];
  if(!requested.length && (p.assetId||p.AssetID))requested.push({AssetID:p.assetId||p.AssetID,Jumlah:Number(p.jumlah||p.Jumlah||1)});
  if(!requested.length)throw new Error('Keranjang peminjaman kosong.');
  const start=normalizeDate(p.tanggalMulai||p.TanggalMulai),end=normalizeDate(p.tanggalSelesai||p.TanggalSelesai);
  if(!start||!end)throw new Error('Tanggal mulai dan selesai wajib diisi.');
  const d1=new Date(start+'T00:00:00'),d2=new Date(end+'T00:00:00');if(d2<d1)throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  const days=Math.max(1,Math.floor((d2-d1)/86400000)+1),items=[];
  for(const req of requested){
    const id=String(req.AssetID||req.assetId||'');if(!id)continue;const snap=await db.collection('assets').doc(id).get();if(!snap.exists)throw new Error('Aset tidak ditemukan: '+id);const a=docRow(snap),qty=Math.max(1,Number(req.Jumlah||req.jumlah||1)),available=Number(a.Tersedia||0);if(qty>available)throw new Error(`${a.Nama||'Aset'} hanya tersedia ${available} unit.`);const tarif=Number(a.TarifHarian||0),depUnit=Number(a.Deposit||0);items.push({AssetID:id,AssetNama:a.Nama||id,Kategori:a.Kategori||'',Jumlah:qty,TarifHarian:tarif,Deposit:depUnit,BiayaSewa:tarif*qty*days,DepositTotal:depUnit*qty});
  }
  if(!items.length)throw new Error('Tidak ada aset valid di keranjang.');
  let sign='',signFileId='';if(p.signatureDataUrl){const f=await uploadDataUrl(p.signatureDataUrl,'Warga','ttd-peminjam-'+Date.now()+'.png','PRIVATE','Signature-Peminjam');sign=f.webViewUrl||'';signFileId=f.fileId||''}
  const biaya=items.reduce((a,b)=>a+Number(b.BiayaSewa||0),0),deposit=items.reduce((a,b)=>a+Number(b.DepositTotal||0),0),id=randomId('PJM'),summary=items.map(x=>`${x.AssetNama} (${x.Jumlah})`).join(', '),totalQty=items.reduce((a,b)=>a+Number(b.Jumlah||0),0);
  const row={ID:id,uid:auth.currentUser.uid,Nama:p.nama||currentProfile.nama,NoHP:p.noHP||currentProfile.noHP||'',Alamat:p.alamat||currentProfile.alamat||'',Items:items,ItemsJson:JSON.stringify(items),AssetID:items[0].AssetID,AssetNama:summary,Jumlah:totalQty,JumlahJenis:items.length,TanggalMulai:start,TanggalSelesai:end,LamaHari:days,Keperluan:p.keperluan||'',BiayaSewa:biaya,Deposit:deposit,TotalTagihan:biaya+deposit,TandaTanganPeminjamUrl:sign,TandaTanganPeminjamFileId:signFileId,Status:'MENUNGGU',createdAt:nowIso()};
  await db.collection('loans').doc(id).set(row);return {ok:true,id,jumlahJenis:items.length,jumlahUnit:totalQty,totalTagihan:biaya+deposit};
}
async function submitRonda(p){await requireActiveUser();const urls=[];for(const [i,data] of (p.fotoDataUrls||[]).entries()){const f=await uploadDataUrl(data,'Ronda',`ronda-${p.tanggal||Date.now()}-${i+1}.jpg`,'PRIVATE','Dokumentasi');urls.push(f.webViewUrl||f.url)}const id=randomId('LRD');await db.collection('rondaLaporan').doc(id).set({ID:id,uid:auth.currentUser.uid,JadwalID:p.jadwalId||'',Tanggal:p.tanggal||nowIso(),JamMulai:p.jamMulai||'',JamSelesai:p.jamSelesai||'',Koordinator:p.koordinator||'',Petugas:p.petugas||[],Kondisi:p.kondisi||'',Catatan:p.catatan||'',TindakLanjut:p.tindakLanjut||'',Lokasi:p.lokasi||'',FotoUrls:urls,createdAt:nowIso()});return {ok:true}}

async function saveSignature(role,dataUrl){await requireAdmin();const f=await uploadDataUrl(dataUrl,'Signature',`ttd-${String(role).toLowerCase()}-${Date.now()}.png`,'PRIVATE',role);const ketua=String(role).toUpperCase()==='KETUA',key=ketua?'SIGN_KETUA_URL':'SIGN_BENDAHARA_URL',fileKey=ketua?'SIGN_KETUA_FILE_ID':'SIGN_BENDAHARA_FILE_ID';const out=await saveConfig({[key]:f.webViewUrl||f.url,[fileKey]:f.fileId||''});return {ok:true,url:f.webViewUrl||f.url,fileId:f.fileId||'',config:out.config}}
async function saveOfficialPhoto(role,dataUrl){await requireAdmin();const f=await uploadDataUrl(dataUrl,'Pengurus',`foto-${String(role).toLowerCase()}-${Date.now()}.jpg`,'PUBLIC');const key=String(role).toUpperCase()==='KETUA'?'PHOTO_KETUA_URL':String(role).toUpperCase()==='SEKRETARIS'?'PHOTO_SEKRETARIS_URL':'PHOTO_BENDAHARA_URL';const out=await saveConfig({[key]:f.directUrl||f.webViewUrl||f.url});return {ok:true,url:f.directUrl||f.webViewUrl||f.url,config:out.config}}
async function saveLetterLogo(dataUrl){await requireAdmin();const f=await uploadDataUrl(dataUrl,'Branding',`logo-kop-${Date.now()}.png`,'PUBLIC');const out=await saveConfig({LETTER_LOGO_URL:f.directUrl||f.webViewUrl||f.url,LETTER_LOGO_FILE_ID:f.fileId||''});return {ok:true,url:f.directUrl||f.webViewUrl||f.url,fileId:f.fileId||'',config:out.config}}
async function uploadAdminMedia(sheet,record,file){await requireAdmin();const maxMb=sheet==='DOKUMEN'?Number(cfg().MAX_DOCUMENT_MB||8):12;if(file.size>maxMb*1024*1024)throw new Error('File terlalu besar. Maksimum '+maxMb+' MB.');const map={KEGIATAN:['Kegiatan','GambarUrl','PUBLIC'],POSYANDU:['Posyandu','GambarUrl','PUBLIC'],ASSET:['Asset','GambarUrl','PUBLIC'],DOKUMEN:['Dokumen','FileUrl','PRIVATE']};const m=map[sheet];if(!m||!file)return record;const data=await fileToDataUrlCompressed(file,sheet==='DOKUMEN'?null:1600),visibility=sheet==='DOKUMEN'?(record.Publik?'PUBLIC':'PRIVATE'):m[2];const f=await uploadDataUrl(data,m[0],file.name,visibility);record[m[1]]=f.directUrl||f.webViewUrl||f.url;record.DriveFileId=f.fileId||'';return record}
function fileToDataUrlCompressed(file,maxWidth){return new Promise((resolve,reject)=>{if(!maxWidth||!String(file.type).startsWith('image/')){const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file);return}const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(w>maxWidth){h=Math.round(h*maxWidth/w);w=maxWidth}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',0.82))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)})}

function loanItemsFromData_(loan){if(Array.isArray(loan?.Items)&&loan.Items.length)return loan.Items;try{const x=JSON.parse(loan?.ItemsJson||'[]');if(Array.isArray(x)&&x.length)return x}catch(e){}return loan?.AssetID?[{AssetID:loan.AssetID,Jumlah:Number(loan.Jumlah||1)}]:[]}
async function loanStatus(id,status){
  await requireAdmin();status=String(status||'').toUpperCase();const loanRef=db.collection('loans').doc(id);
  if(status==='DISETUJUI'){
    await db.runTransaction(async tx=>{const ls=await tx.get(loanRef);if(!ls.exists)throw new Error('Peminjaman tidak ditemukan');const loan=docRow(ls);if(loan.StockApplied){tx.set(loanRef,{Status:status,updatedAt:nowIso()},{merge:true});return}const items=loanItemsFromData_(loan),reads=[];for(const it of items){const ref=db.collection('assets').doc(String(it.AssetID||''));const snap=await tx.get(ref);if(!snap.exists)throw new Error('Aset tidak ditemukan: '+it.AssetID);reads.push([ref,snap,it])}for(const [ref,snap,it] of reads){const a=docRow(snap),qty=Number(it.Jumlah||1),available=Number(a.Tersedia||0);if(available<qty)throw new Error(`${a.Nama||'Aset'} tinggal ${available} unit, sedangkan pengajuan meminta ${qty}.`);tx.set(ref,{Tersedia:available-qty,updatedAt:nowIso()},{merge:true})}tx.set(loanRef,{Status:status,StockApplied:true,StockReturned:false,approvedAt:nowIso(),approvedBy:auth.currentUser.uid,updatedAt:nowIso()},{merge:true})});
  }else if(['SELESAI','DIKEMBALIKAN','DIBATALKAN','DITOLAK'].includes(status)){
    await db.runTransaction(async tx=>{const ls=await tx.get(loanRef);if(!ls.exists)throw new Error('Peminjaman tidak ditemukan');const loan=docRow(ls),items=loanItemsFromData_(loan),restore=loan.StockApplied&&!loan.StockReturned;if(restore){const reads=[];for(const it of items){const ref=db.collection('assets').doc(String(it.AssetID||''));const snap=await tx.get(ref);if(snap.exists)reads.push([ref,snap,it])}for(const [ref,snap,it] of reads){const a=docRow(snap),stock=Number(a.Stok||0),next=Math.min(stock||999999,Number(a.Tersedia||0)+Number(it.Jumlah||1));tx.set(ref,{Tersedia:next,updatedAt:nowIso()},{merge:true})}}tx.set(loanRef,{Status:status,StockReturned:restore?true:!!loan.StockReturned,updatedAt:nowIso()},{merge:true})});
  }else await loanRef.set({Status:status,updatedAt:nowIso()},{merge:true});return {ok:true,status};
}
async function reportData(type,period){await requireAdmin();const [yy,mm]=String(period).split('-').map(Number),start=`${yy}-${String(mm).padStart(2,'0')}-01`,endDate=new Date(yy,mm,0),end=`${yy}-${String(mm).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`,periodLabel=new Date(yy,mm-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'}),config=await settings();if(type==='FINANCE'){const all=await allRows('keuangan'),rows=all.filter(x=>normalizeDate(x.Tanggal).startsWith(period));const masuk=rows.filter(x=>String(x.Jenis).toUpperCase()==='MASUK').reduce((a,b)=>a+Number(b.Nominal||0),0),keluar=rows.filter(x=>String(x.Jenis).toUpperCase()==='KELUAR').reduce((a,b)=>a+Number(b.Nominal||0),0),before=all.filter(x=>normalizeDate(x.Tanggal)<start),saldoAwal=before.reduce((a,b)=>a+(String(b.Jenis).toUpperCase()==='MASUK'?1:-1)*Number(b.Nominal||0),0);return {ok:true,type:'FINANCE',period,periodLabel,start,end,config,summary:{saldoAwal,pemasukan:masuk,pengeluaran:keluar,saldoAkhir:saldoAwal+masuk-keluar},rows:sortDate(rows,'Tanggal')}}const rows=await allRows('assets');return {ok:true,type:'INVENTORY',period,periodLabel,start,end,config,summary:{jenis:rows.length,stok:rows.reduce((a,b)=>a+Number(b.Stok||0),0),tersedia:rows.reduce((a,b)=>a+Number(b.Tersedia||0),0),dipinjam:rows.reduce((a,b)=>a+Math.max(0,Number(b.Stok||0)-Number(b.Tersedia||0)),0)},rows}}
async function generatePdf(kind,payload){await requireAdmin();const token=await idToken();if(!g.RTDriveApi)throw new Error('Drive API tidak tersedia');return RTDriveApi.post(kind,payload,token)}
async function pdfLoan(id){const s=await db.collection('loans').doc(id).get();if(!s.exists)throw new Error('Peminjaman tidak ditemukan');const config=await settings(),loan=docRow(s),d=new Date(),roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][d.getMonth()],nomor=loan.NomorSurat||`${String(loan.ID||id).replace(/[^A-Za-z0-9-]/g,'')}/${config.LETTER_NUMBER_PREFIX||'RT01/RW04'}/${roman}/${d.getFullYear()}`;loan.NomorSurat=nomor;const out=await generatePdf('pdf.loan',{loan,config});await db.collection('loans').doc(id).set({NomorSurat:nomor,PdfUrl:out.file.webViewUrl,DriveFileId:out.file.fileId||'',updatedAt:nowIso()},{merge:true});return {ok:true,url:out.file.webViewUrl,nomor}}
async function pdfLetter(p){const out=await generatePdf('pdf.letter',{letter:p,config:await settings()});const id=randomId('SRT');await db.collection('surat').doc(id).set({ID:id,Nomor:p.nomor||'',Jenis:p.jenis||'',Tanggal:p.tanggal||new Date().toISOString().slice(0,10),Nama:p.nama||'',Perihal:p.perihal||'',Isi:p.isi||'',Status:'FINAL',PdfUrl:out.file.webViewUrl,DriveFileId:out.file.fileId,createdAt:nowIso()});return {ok:true,url:out.file.webViewUrl}}
async function pdfReport(type,period){const data=await reportData(type,period),out=await generatePdf('pdf.report',{report:data,config:await settings()});const id=randomId('LAP');await db.collection('laporanBulanan').doc(id).set({ID:id,Tipe:type,Periode:period,PdfUrl:out.file.webViewUrl,DriveFileId:out.file.fileId,createdAt:nowIso()});return {ok:true,url:out.file.webViewUrl}}

async function requestPushPermission(){
  await init();if(!messaging)throw new Error('Push notification tidak didukung browser ini.');if(!auth.currentUser)throw new Error('Login warga terlebih dahulu untuk mengaktifkan push.');const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('Izin notifikasi tidak diberikan.');const reg=await navigator.serviceWorker.register('./firebase-messaging-sw.js');const token=await messaging.getToken({vapidKey:cfg().FIREBASE_VAPID_KEY,serviceWorkerRegistration:reg});if(!token)throw new Error('Token notifikasi tidak tersedia.');const id=auth.currentUser.uid+'-'+btoa(token).replace(/[^a-zA-Z0-9]/g,'').slice(0,20);await db.collection('fcmTokens').doc(id).set({ID:id,uid:auth.currentUser.uid,token,platform:navigator.userAgent,updatedAt:nowIso()},{merge:true});return {ok:true,token}}
function startRealtime(onChange,onNotification){
  stopRealtime();if(!db)return;['settings','ronda','rondaPetugas','rondaTukar','posyandu','kegiatan','keuangan','assets','pengumuman','documents','notifications','complaintPublic'].forEach(c=>{const target=c==='settings'?db.collection(c).doc('app'):db.collection(c);const unsub=target.onSnapshot(()=>{clearTimeout(startRealtime._t);startRealtime._t=setTimeout(async()=>{try{const b=await publicBundle();onChange?.(b)}catch(e){console.warn('Realtime refresh',e)}},250)});unsubs.push(unsub)});
  const n=db.collection('notifications').orderBy('createdAt','desc').limit(1).onSnapshot(s=>{s.docChanges().forEach(ch=>{if(ch.type==='added')onNotification?.(docRow(ch.doc))})},()=>{});unsubs.push(n)
}
function stopRealtime(){unsubs.forEach(fn=>{try{fn()}catch(e){}});unsubs=[]}

async function seedInitialData(){
  await requireAdmin();const batch=db.batch();const sc=db.collection('settings').doc('app');batch.set(sc,defaultConfig(),{merge:true});
  const today=new Date();const names=['Sartono','Heru','Jamad','Satman','Saliman','Ngusman','Basori'];for(let i=0;i<7;i++){const d=new Date(today);d.setDate(today.getDate()+i);const iso=d.toISOString().slice(0,10),id='RND-'+iso;batch.set(db.collection('ronda').doc(id),{ID:id,Tanggal:iso,Hari:d.toLocaleDateString('id-ID',{weekday:'long'}),JamMulai:'22:00',JamSelesai:'04:00',Koordinator:names[i%names.length],Status:'AKTIF'});for(let j=0;j<5;j++){const pid=`PET-${iso}-${j+1}`;batch.set(db.collection('rondaPetugas').doc(pid),{ID:pid,JadwalID:id,Nama:names[(i+j)%names.length],Urutan:j+1,Aktif:true})}}
  const pos=[['BALITA','Posyandu Balita','Balita','Selasa','2','08:00'],['REMAJA','Posyandu Remaja','Remaja','Sabtu','2','15:30'],['LANSIA','Posyandu Lansia','Lansia','Kamis','3','08:00'],['IMUNISASI','Imunisasi','Balita','Selasa','2','08:00']];pos.forEach((x,i)=>batch.set(db.collection('posyandu').doc('POS-'+(i+1)),{ID:'POS-'+(i+1),Jenis:x[0],Judul:x[1],KelompokUsia:x[2],Hari:x[3],MingguKe:x[4],Jam:x[5],Lokasi:'Rumah Pak Kadus 2 Sigit Prasetyo',LayananJson:'["Pemeriksaan kesehatan","Konsultasi","Pencatatan"]',Aktif:true}));
  const keg=[['AGAMA','Yasinan','Kamis','Malam Jumat','Rumah warga bergilir'],['AGAMA','Sholawat Barzanji','Sabtu','Malam Minggu','Mushola/rumah warga'],['AGAMA','Pengajian TPA','Sabtu','15:30','TPA lingkungan'],['AGAMA','Semakan Al-Quran','Jumat','Sore','Lingkungan RT'],['SOSIAL','Kerja Bakti RT',new Date(today.getTime()+3*86400000).toISOString().slice(0,10),'07:00','Lingkungan RT']];keg.forEach((x,i)=>batch.set(db.collection('kegiatan').doc('KEG-'+(i+1)),{ID:'KEG-'+(i+1),Kategori:x[0],Judul:x[1],Tanggal:x[2].match(/^\d{4}/)?x[2]:'',Hari:x[2].match(/^\d{4}/)?'':x[2],Jam:x[3],Lokasi:x[4],Deskripsi:'Agenda warga RT 01 RW 04.',Aktif:true}));
  await batch.commit();return {ok:true}}

async function bootstrapSuperAdmin(){await init();const u=auth.currentUser;if(!u)throw new Error('Login Firebase terlebih dahulu.');await u.reload();if(String(u.email||'').toLowerCase()!==String(cfg().ADMIN_BOOTSTRAP_EMAIL||'').toLowerCase())throw new Error('Email bukan email bootstrap admin.');if(!u.emailVerified)throw new Error('Email admin belum diverifikasi. Cek inbox dan klik tautan verifikasi.');const row={uid:u.uid,nama:'Super Admin RT 01 RW 04',email:u.email,role:'SUPER_ADMIN',status:'AKTIF',createdAt:nowIso(),updatedAt:nowIso()};await db.collection('users').doc(u.uid).set(row,{merge:true});currentProfile=await profileFor(u.uid);return {ok:true,user:currentProfile}}

async function getWeather(lat,lng){const u=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,weather_code&timezone=Asia%2FJakarta`;const d=await fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Cuaca tidak tersedia');return r.json()});const code=Number(d.current?.weather_code),map={0:'Cerah',1:'Cerah Berawan',2:'Cerah Berawan',3:'Berawan',45:'Berkabut',48:'Berkabut',61:'Hujan',63:'Hujan',65:'Hujan',80:'Hujan Lokal',81:'Hujan Lokal',82:'Hujan Lokal',95:'Hujan Petir',96:'Hujan Petir',99:'Hujan Petir'};return {ok:true,temperature:d.current?.temperature_2m,weatherCode:code,description:map[code]||'Cuaca berubah'}}
async function getPrayerTimes(lat,lng){const u=`https://api.aladhan.com/v1/timings?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=20&school=1`;const d=await fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Jadwal sholat tidak tersedia');return r.json()});const t=d.data?.timings||{},cut=v=>String(v||'').split(' ')[0].slice(0,5);return {ok:true,latitude:Number(lat),longitude:Number(lng),timings:{Subuh:cut(t.Fajr),Dzuhur:cut(t.Dhuhr),Ashar:cut(t.Asr),Maghrib:cut(t.Maghrib),Isya:cut(t.Isha)},extras:{Imsak:cut(t.Imsak),Terbit:cut(t.Sunrise)},hijri:d.data?.date?.hijri||null,timezone:d.data?.meta?.timezone||'Asia/Jakarta'}}
async function getImsakiyah(lat,lng,month,year){const u=`https://api.aladhan.com/v1/calendar?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=20&school=1&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;const d=await fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Jadwal imsakiyah tidak tersedia');return r.json()});const cut=v=>String(v||'').split(' ')[0].slice(0,5),rows=(d.data||[]).map(x=>({date:String(x.date?.gregorian?.date||'').split('-').reverse().join('-'),hijri:`${x.date?.hijri?.day||''} ${x.date?.hijri?.month?.en||''} ${x.date?.hijri?.year||''} H`,Imsak:cut(x.timings?.Imsak),Subuh:cut(x.timings?.Fajr),Terbit:cut(x.timings?.Sunrise),Dzuhur:cut(x.timings?.Dhuhr),Ashar:cut(x.timings?.Asr),Maghrib:cut(x.timings?.Maghrib),Isya:cut(x.timings?.Isha)}));return {ok:true,latitude:Number(lat),longitude:Number(lng),month:Number(month),year:Number(year),rows}}

async function call(fn,...args){
  await init();
  switch(fn){
    case 'getPublicAppData': return publicBundle();
    case 'getWeather': return getWeather(args[0],args[1]);
    case 'getPrayerTimes': return getPrayerTimes(args[0],args[1]);
    case 'getImsakiyah': return getImsakiyah(args[0],args[1],args[2],args[3]);
    case 'userRegister': return registerUser(args[0]||{});
    case 'userLogin': return loginUser(args[0],args[1],false);
    case 'userMe': return me(); case 'userLogout': return logout(); case 'passwordReset': return sendPasswordReset(args[0]);
    case 'adminLogin': return loginUser(args[0],args[1],true); case 'adminLogout': return logout(); case 'getAdminDashboard': return dashboard();
    case 'adminWargaAccounts': return wargaAccounts(); case 'adminWargaStatus': return wargaStatus(args[0],args[1],args[2]);
    case 'adminList': return adminList(args[0]); case 'adminUpsert': return adminUpsert(args[0],args[1]||{}); case 'adminDelete': return adminDelete(args[0],args[1]); case 'adminSaveConfig': return saveConfig(args[0]||{});
    case 'submitComplaint': return submitComplaint(args[0]||{});case 'submitFeedback':return submitFeedback(args[0]||{});case 'submitLetterRequest':return submitLetter(args[0]||{});case 'submitLoan':return submitLoan(args[0]||{});case 'submitRondaReport':return submitRonda(args[0]||{});
    case 'adminSaveSignature':return saveSignature(args[0],args[1]);case 'adminSaveOfficialPhoto':return saveOfficialPhoto(args[0],args[1]);case 'adminSaveLetterLogo':return saveLetterLogo(args[0]);
    case 'adminApproveLoan':return loanStatus(args[0],args[1]);case 'generateLoanApprovalPdf':return pdfLoan(args[0]);case 'generateOfficialLetterPdf':return pdfLetter(args[0]||{});
    case 'getMonthlyReportData':return reportData(String(args[0]).toUpperCase(),`${Number(args[1])}-${String(Number(args[2])).padStart(2,'0')}`);
    case 'generateFinanceMonthlyReportPdf':return pdfReport('FINANCE',`${Number(args[0])}-${String(Number(args[1])).padStart(2,'0')}`);case 'generateInventoryMonthlyReportPdf':return pdfReport('INVENTORY',`${Number(args[0])}-${String(Number(args[1])).padStart(2,'0')}`);
    default:throw new Error('Fungsi V6 belum dipetakan: '+fn);
  }
}

g.RTV6={init,call,defaultBundle,cachedBundle,publicBundle,restoreSession:me,startRealtime,stopRealtime,requestPushPermission,seedInitialData,bootstrapSuperAdmin,idToken,uploadAdminMedia,isAdminProfile,get profile(){return currentProfile},get auth(){return auth},get db(){return db}};
})(window);
