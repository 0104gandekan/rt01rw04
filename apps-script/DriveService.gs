const PUBLIC_CATEGORIES=['Pengurus','Kegiatan','Posyandu','Asset','Branding','Dokumen'];
const ADMIN_ONLY_CATEGORIES=['Pengurus','Kegiatan','Posyandu','Asset','Branding','Dokumen','Surat','Laporan','Signature'];
function uploadDriveFile_(p,actor){
  if(!actor.active)throw new Error('Akun belum aktif.');
  const category=safeFolderName_(p.category||'Warga');
  if(ADMIN_ONLY_CATEGORIES.includes(category))requireAdmin_(actor);
  const mime=String(p.mimeType||'application/octet-stream'),b64=String(p.base64||'');if(!b64)throw new Error('Isi file kosong.');
  const bytes=Utilities.base64Decode(b64);if(bytes.length>12*1024*1024)throw new Error('File terlalu besar. Maksimum 12 MB setelah encoding.');
  const name=safeFileName_(p.fileName||('file-'+Date.now())),root=ensureRootFolder_(),cat=ensureChildFolder_(root,category);
  const d=new Date(),year=ensureChildFolder_(cat,String(d.getFullYear())),month=ensureChildFolder_(year,String(d.getMonth()+1).padStart(2,'0'));
  const target=p.subfolder?ensureChildFolder_(month,safeFolderName_(p.subfolder)):month;
  const blob=Utilities.newBlob(bytes,mime,name),file=target.createFile(blob),wantPublic=String(p.visibility||'PRIVATE').toUpperCase()==='PUBLIC'&&PUBLIC_CATEGORIES.includes(category);
  if(wantPublic){try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW)}catch(e){}}
  return {ok:true,file:fileInfo_(file,wantPublic)};
}
function ensureRootFolder_(){
  const props=PropertiesService.getScriptProperties(),id=props.getProperty(PROP.ROOT_FOLDER_ID);if(id){try{return DriveApp.getFolderById(id)}catch(e){}}
  const it=DriveApp.getFoldersByName(ROOT_FOLDER_NAME),f=it.hasNext()?it.next():DriveApp.createFolder(ROOT_FOLDER_NAME);props.setProperty(PROP.ROOT_FOLDER_ID,f.getId());return f;
}
function ensureChildFolder_(parent,name){const it=parent.getFoldersByName(name);return it.hasNext()?it.next():parent.createFolder(name)}
function safeFolderName_(s){return String(s||'File').replace(/[\\/:*?"<>|]/g,'-').replace(/\.{2,}/g,'.').trim().slice(0,80)||'File'}
function safeFileName_(s){return String(s||'file').replace(/[\\/:*?"<>|]/g,'-').trim().slice(0,140)||('file-'+Date.now())}
function fileInfo_(file,isPublic){const mime=file.getMimeType(),direct=isPublic&&String(mime).indexOf('image/')===0?'https://drive.google.com/thumbnail?id='+file.getId()+'&sz=w1600':file.getUrl();return {fileId:file.getId(),name:file.getName(),mimeType:mime,size:file.getSize(),webViewUrl:file.getUrl(),directUrl:direct,public:isPublic}}
