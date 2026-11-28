/* Transcritor: service worker. Troque a versão quando mudar os arquivos. */
var VER='transcritor-1';
var CORE=['./','index.html','worker.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VER).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('transcritor-')===0&&k!==VER}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  /* a biblioteca do Whisper (jsdelivr) e as fontes também ficam guardadas, para funcionar sem internet;
     os modelos ficam no cache próprio da biblioteca */
  var deFora=u.hostname==='cdn.jsdelivr.net'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(u.origin!==self.location.origin&&!deFora)return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(function(res){
      if(res&&res.ok){var cp=res.clone();caches.open(VER).then(function(c){c.put('index.html',cp)})}
      return res;
    }).catch(function(){return caches.match('index.html')}));
    return;
  }
  e.respondWith(caches.match(r).then(function(m){
    var net=fetch(r).then(function(res){
      if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(VER).then(function(c){c.put(r,cp)})}
      return res;
    });
    if(m){net.catch(function(){});return m}
    return net;
  }));
});
