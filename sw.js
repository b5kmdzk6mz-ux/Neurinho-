/* Neurinho: service worker. Versao do conteudo: d7ad862ce6 */
var VER='neurinho-d7ad862ce6';
var CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VER).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('neurinho-')===0&&k!==VER}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  var same=u.origin===self.location.origin;
  var font=u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(!same&&!font)return;
  if(r.mode==='navigate'||(same&&u.pathname.slice(-5)==='.html')){
    /* rede primeiro, para as novidades chegarem; cache se estiver offline */
    e.respondWith(fetch(r).then(function(res){
      var cp=res.clone();caches.open(VER).then(function(c){c.put('index.html',cp)});return res;
    }).catch(function(){return caches.match('index.html').then(function(m){return m||caches.match('./')})}));
    return;
  }
  e.respondWith(caches.match(r).then(function(m){
    var net=fetch(r).then(function(res){
      if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(VER).then(function(c){c.put(r,cp)})}
      return res;
    }).catch(function(){return m});
    return m||net;
  }));
});
