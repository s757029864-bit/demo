import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAccountServer,encodePassword} from './server.mjs';
test('server-side registration, roles, CSRF and revoked sessions',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'account-test-')),adminPassword='Test-only-admin-strong-2026',agentPassword='Test-only-agent-strong-2026';
 const server=createAccountServer({requireBuyerAccount:false,dataDir:dir,secure:false,bootstrap:{username:'757029864',passwordHash:encodePassword(adminPassword)}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const call=async(p,b,cookie='',csrf='',requestOrigin=origin)=>{const r=await fetch(origin+p,{redirect:'manual',method:b?'POST':'GET',headers:{Origin:requestOrigin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},...(b?{body:JSON.stringify(b)}:{})});return {r,cookie:r.headers.get('set-cookie')?.split(';')[0],json:async()=>r.json()}};
 try{
  assert.equal((await call('/admin/')).r.status,303);assert.equal((await call('/api/agents')).r.status,401);assert.equal((await call('/bootstrap.json')).r.status,404);assert.equal((await call('/data/accounts.sqlite')).r.status,404);
  assert.equal((await call('/api/register',{username:'intruder',password:adminPassword})).r.status,400);
  const registered=await call('/api/register',{username:'757029864',password:adminPassword});assert.equal(registered.r.status,201);assert.match(registered.r.headers.get('set-cookie'),/HttpOnly/);const adminCookie=registered.cookie;let me=await (await call('/api/me',null,adminCookie)).json();assert.equal(me.role,'admin');
  assert.equal((await call('/api/register',{username:'757029864',password:adminPassword})).r.status,409);
  assert.equal((await call('/api/agents/create',{username:'a',password:agentPassword},adminCookie)).r.status,403);
  assert.equal((await call('/api/agents/create',{username:'a',password:agentPassword},adminCookie,me.csrf,'https://evil.example')).r.status,403);
  assert.equal((await call('/api/agents/create',{username:'a',password:agentPassword},adminCookie,me.csrf)).r.status,201);
  const agents=await(await call('/api/agents',null,adminCookie)).json();assert.equal(agents.length,1);assert.equal(agents[0].password,undefined);
  const agent=await call('/api/login',{username:'a',password:agentPassword});assert.equal(agent.r.status,200);const agentCookie=agent.cookie;const agentMe=await(await call('/api/me',null,agentCookie)).json();
  assert.equal((await call('/admin/',null,agentCookie)).r.status,403);assert.equal((await call('/agent/',null,agentCookie)).r.status,200);assert.equal((await call('/api/agents',null,agentCookie)).r.status,403);
  assert.equal((await call('/api/agents/create',{username:'b',password:agentPassword,role:'admin'},agentCookie,agentMe.csrf)).r.status,403);
  assert.equal((await call('/api/agents/update',{id:agents[0].id,active:false},adminCookie,me.csrf)).r.status,200);assert.equal((await call('/api/me',null,agentCookie)).r.status,401);assert.equal((await call('/api/login',{username:'a',password:agentPassword})).r.status,401);
  await call('/api/agents/update',{id:agents[0].id,active:true,password:'Reset-agent-password-2026'},adminCookie,me.csrf);assert.equal((await call('/api/login',{username:'a',password:agentPassword})).r.status,401);assert.equal((await call('/api/login',{username:'a',password:'Reset-agent-password-2026'})).r.status,200);
  assert.equal((await call('/api/password',{oldPassword:adminPassword,password:'New-admin-password-2026'},adminCookie,me.csrf)).r.status,200);assert.equal((await call('/api/me',null,adminCookie)).r.status,401);
  const content=await readFile(path.join(dir,'accounts.sqlite'));assert.equal(content.includes(Buffer.from(adminPassword)),false);assert.equal(content.includes(Buffer.from(agentPassword)),false);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
});
