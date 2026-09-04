const V6_VERSION = '6.1.0';
const ROOT_FOLDER_NAME = 'RT01_RW04_DIGITAL';
const PROP = {
  FIREBASE_PROJECT_ID: 'FIREBASE_PROJECT_ID',
  FIREBASE_WEB_API_KEY: 'FIREBASE_WEB_API_KEY',
  ROOT_FOLDER_ID: 'ROOT_FOLDER_ID',
  FCM_CLIENT_EMAIL: 'FCM_CLIENT_EMAIL',
  FCM_PRIVATE_KEY: 'FCM_PRIVATE_KEY'
};

// Isi dua nilai berikut sekali sebelum menjalankan setupV6(). API key Firebase Web bukan secret,
// tetapi jangan pernah menaruh FCM private key di source code.
const V6_SETUP = {
  FIREBASE_PROJECT_ID: 'PASTE_FIREBASE_PROJECT_ID',
  FIREBASE_WEB_API_KEY: 'PASTE_FIREBASE_WEB_API_KEY'
};

function setupV6(){
  if(String(V6_SETUP.FIREBASE_PROJECT_ID).indexOf('PASTE_')===0) throw new Error('Isi V6_SETUP.FIREBASE_PROJECT_ID di Config.gs.');
  if(String(V6_SETUP.FIREBASE_WEB_API_KEY).indexOf('PASTE_')===0) throw new Error('Isi V6_SETUP.FIREBASE_WEB_API_KEY di Config.gs.');
  const p=PropertiesService.getScriptProperties();
  p.setProperty(PROP.FIREBASE_PROJECT_ID,String(V6_SETUP.FIREBASE_PROJECT_ID));
  p.setProperty(PROP.FIREBASE_WEB_API_KEY,String(V6_SETUP.FIREBASE_WEB_API_KEY));
  const root=ensureRootFolder_();
  ['Pengurus','Ronda','Posyandu','Kegiatan','Aduan','Asset','Dokumen','Surat','Laporan','Signature','Branding','Warga'].forEach(n=>ensureChildFolder_(root,n));
  return {ok:true,version:V6_VERSION,rootFolderId:root.getId(),message:'V6 Google Drive service siap.'};
}

function deploymentStatus(){
  const p=PropertiesService.getScriptProperties();
  return {
    ok:true,version:V6_VERSION,
    firebaseProjectConfigured:!!p.getProperty(PROP.FIREBASE_PROJECT_ID),
    firebaseApiKeyConfigured:!!p.getProperty(PROP.FIREBASE_WEB_API_KEY),
    rootFolderConfigured:!!p.getProperty(PROP.ROOT_FOLDER_ID),
    fcmConfigured:!!(p.getProperty(PROP.FCM_CLIENT_EMAIL)&&p.getProperty(PROP.FCM_PRIVATE_KEY))
  };
}
