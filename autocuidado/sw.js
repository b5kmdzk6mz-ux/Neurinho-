/* Provedor do Autocuidado: service worker (funciona sem internet). */
var VER='autocuidado-v2';
var CORE=['./','index.html','manifest.webmanifest','logo.svg','qrcode.svg','icon-192.png','icon-512.png','maskable-512.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VER).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('autocuidado-')===0&&k!==VER}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  if(r.mode==='navigate'){
    /* rede primeiro (para atualizar), cache se estiver sem internet */
    e.respondWith(fetch(r).then(function(res){
      var cp=res.clone();caches.open(VER).then(function(c){c.put('index.html',cp)});return res;
    }).catch(function(){return caches.match('index.html').then(function(m){return m||caches.match('./')})}));
    return;
  }
  e.respondWith(caches.match(r).then(function(m){
    var net=fetch(r).then(function(res){
      if(res&&res.ok){var cp=res.clone();caches.open(VER).then(function(c){c.put(r,cp)})}
      return res;
    }).catch(function(){return m});
    return m||net;
  }));
});
