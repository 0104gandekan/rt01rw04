importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
importScripts('./js/firebase-config.js');
try{
  firebase.initializeApp(self.RT_FIREBASE_CONFIG);
  const messaging=firebase.messaging();
  messaging.onBackgroundMessage(payload=>{
    const n=payload.notification||{},d=payload.data||{};
    self.registration.showNotification(n.title||'RT 01 RW 04',{body:n.body||'Ada informasi baru.',icon:'./assets/icons/icon-192.png',badge:'./assets/icons/icon-192.png',data:{page:d.page||'home'}});
  });
}catch(e){console.error('FCM SW',e)}
self.addEventListener('notificationclick',event=>{
  event.notification.close();const page=event.notification.data?.page||'home';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.postMessage({type:'OPEN_PAGE',page});return c.focus()}}return clients.openWindow('./#'+encodeURIComponent(page))}));
});
