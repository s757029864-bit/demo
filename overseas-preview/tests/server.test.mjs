import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createPreviewServer} from '../server.mjs';

test('preview serves only public files and never pretends payment APIs are active',async()=>{
  const server=createPreviewServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  const raw=pathname=>new Promise((resolve,reject)=>{
    const req=http.get(origin+pathname,res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);
  });
  try{
    for(const page of ['/','/agent/','/admin/','/guide/']){
      const r=await fetch(origin+page);assert.equal(r.status,200,page);
      assert.match(r.headers.get('content-type'),/text\/html/);
      assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
      assert.equal(r.headers.get('x-frame-options'),'DENY');
      assert.equal(r.headers.get('x-content-type-options'),'nosniff');
      assert.equal(r.headers.get('referrer-policy'),'no-referrer');
      assert.match(await r.text(),/<html/);
    }
    const head=await fetch(origin+'/agent/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    const redirect=await fetch(origin+'/agent?ref=a',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/agent/?ref=a');
    const status=await (await fetch(origin+'/healthz')).json();assert.equal(status.mode,'demo');assert.equal(status.payments,'disabled');
    const payment=await fetch(origin+'/api/payments/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paid:true})});assert.equal(payment.status,503);assert.equal((await payment.json()).error,'DEMO_ONLY');
    assert.equal((await fetch(origin+'/',{method:'POST'})).status,405);
    for(const file of ['/server.mjs','/package.json','/.env','/README.md','/missing/'])assert.equal((await fetch(origin+file)).status,404,file);
    for(const attack of ['/%2e%2e%2fserver.mjs','/%5c..%5cserver.mjs','/%00','/%ZZ','//agent'])assert.equal(await raw(attack),400,attack);
    assert.equal((await fetch(origin+'/admin/security-review.txt')).status,200);
    console.log('PASS HTTP/HEAD, health, redirects, headers, file isolation, traversal rejection and disabled payment APIs');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
