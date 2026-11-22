/* Sinapse: service worker. Troque a versão quando mudar os arquivos. */
var VER='sinapse-21';
var CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','../vendor/pdf.min.mjs','../OpenDyslexic-Regular.otf','../vendor/anthropic-sdk.mjs','../vendor/supabase.js','../vendor/pdf.worker.min.mjs',
  'arte/capa-aura.jpg','arte/capa-holo.jpg','arte/capa-peach.jpg','arte/capa-waves.jpg','arte/capa-mystic.jpg'].concat(
  ['brilho','lua','olho','cristal','borboleta','laco','morango','coracao','estrela-cadente','nuvem','bolha','neuronios'].map(function(n){return 'arte/adesivos/'+n+'.webp'}));
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VER).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k.indexOf('sinapse-')===0&&k!==VER}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  var font=u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(u.origin!==self.location.origin&&!font)return;
  if(r.mode==='navigate'){
    /* rede primeiro, para as atualizações chegarem; cache se estiver offline */
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
    }).catch(function(){return m});
    return m||net;
  }));
});
