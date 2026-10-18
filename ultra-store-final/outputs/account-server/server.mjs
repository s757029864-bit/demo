import http from 'node:http';
import {isIP} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAfterSales} from './after-sales.mjs';
import {createOperations} from './operations.mjs';
import {createWarehouse} from './warehouse-store.mjs';
import {createShop} from './shop-store.mjs';
import {storefrontHTML} from './storefront.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
import {encodePassword,verify,passOK} from './auth-crypto.mjs';
export {encodePassword} from './auth-crypto.mjs';
export function createAccountServer(options={}){
 const dir=options.dataDir||process.env.DATA_DIR||path.join(here,'data');mkdirSync(dir,{recursive:true});
 const db=new DatabaseSync(path.join(dir,'accounts.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,role TEXT NOT NULL,password TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,version INTEGER NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);`);
 for(const [name,definition] of Object.entries({tier:"TEXT NOT NULL DEFAULT 'A'",approval:"TEXT NOT NULL DEFAULT 'approved'",display_name:"TEXT NOT NULL DEFAULT ''",contact:"TEXT NOT NULL DEFAULT ''",prices:"TEXT NOT NULL DEFAULT '{\"go\":45,\"plus\":120,\"pro\":680}'"})){
  if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name===name))db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
 }
 db.exec('CREATE TABLE IF NOT EXISTS procurements(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,product TEXT NOT NULL,quantity INTEGER NOT NULL,unit_cents INTEGER NOT NULL,total_cents INTEGER NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL)');
 db.exec("CREATE TABLE IF NOT EXISTS inventory(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,product TEXT NOT NULL,code TEXT NOT NULL UNIQUE,status TEXT NOT NULL,created INTEGER NOT NULL)");
 if(!db.prepare('PRAGMA table_info(inventory)').all().some(c=>c.name==='procurement_id'))db.exec('ALTER TABLE inventory ADD COLUMN procurement_id TEXT');
 let bootstrap=options.bootstrap;
 if(!bootstrap){try{bootstrap=JSON.parse(readFileSync(path.join(here,'bootstrap.json'),'utf8'))}catch{bootstrap={username:process.env.ADMIN_USERNAME||'757029864',passwordHash:process.env.ADMIN_REGISTRATION_HASH}}}
 db.exec("CREATE UNIQUE INDEX IF NOT EXISTS single_admin ON users(role) WHERE role='admin'");
 const secure=options.secure??process.env.COOKIE_SECURE!=='false';const operations=createOperations(db,dir); const dummyPassword=encodePassword(randomBytes(32).toString('hex'));
 function clientIP(req){const remote=req.socket.remoteAddress||'',normalized=remote.replace(/^::ffff:/,'');const proxyIP=options.trustedProxyIP;const supplied=req.headers['x-ultra-client-ip'];if(proxyIP&&isIP(proxyIP)&&normalized===proxyIP&&typeof supplied==='string'&&isIP(supplied))return supplied;const forwarded=req.headers['cf-connecting-ip'];return options.trustCloudflare&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:remote;}
 const demoPayments=options.demoPayments??(process.env.DEMO_PAYMENTS_ENABLED?process.env.DEMO_PAYMENTS_ENABLED==='true':process.env.NODE_ENV!=='production');
 const warehouse=createWarehouse(db);const afterSales=createAfterSales(db,{log:warehouse.log});const shop=createShop(db,{secure,log:warehouse.log,requireBuyerAccount:options.requireBuyerAccount??true,allowDemo:demoPayments,afterSales});
 const rate=(key,limit=10)=>operations.rate(key,limit);
 function session(req){const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('sid='))?.slice(4);if(!token)return null;return db.prepare('SELECT u.id,u.username,u.role,u.active,u.approval,u.tier,u.display_name,u.contact,u.prices,u.version,s.csrf,s.expires,s.token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND s.version=u.version AND u.active=1').get(hash(token),Date.now())}
 function issue(res,u){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(token),u.id,u.version,csrf,Date.now()+8*3600000);res.setHeader('Set-Cookie',`sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`)}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  const send=(status,value,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(typeof value==='string'?value:JSON.stringify(value))};
  const redirect=p=>{res.writeHead(303,{Location:p});res.end()};
  try{
   const url=new URL(req.url,'http://localhost'),p=url.pathname;let u=session(req);
   if(req.method==='GET'&&p==='/healthz')return send(200,{status:db.prepare('SELECT 1 n').get().n===1?'ok':'error',payments:demoPayments?'simulation':'disabled'});
   if(req.method==='GET'&&p==='/'){
    const {html,policy}=storefrontHTML();res.setHeader('Content-Security-Policy',policy);return send(200,html,'text/html; charset=utf-8');
   }
   if(req.method==='GET'&&p==='/api/shop')return send(200,shop.state(req,res));
   if(req.method==='GET'&&p==='/api/retail-orders')return u?.role==='admin'?send(200,shop.adminOrders()):send(u?403:401,{error:'仅管理员可查看买方订单'});
   if(req.method==='GET'&&p==='/api/retail-prices')return u?.role==='admin'?send(200,shop.price()):send(u?403:401,{error:'无权访问'});
   if(req.method==='GET'&&p==='/payment-qr.jpg'){
    if(!u||u.role!=='agent'||u.approval!=='approved')return send(403,{error:'请先通过代理审核'});
    res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(readFileSync(path.join(here,'../overseas-preview/public/assets/wechat-payment.jpg')));
   }
   if(req.method==='GET'&&p==='/app.js')return send(200,readFileSync(path.join(here,'app.js'),'utf8'),'text/javascript; charset=utf-8');
   if(p.startsWith('/admin/')){
    if(req.method==='GET'&&p==='/admin/accounts/')return redirect('/admin/accounts');
    const login='/login?next='+encodeURIComponent(p==='/admin/accounts'?'/admin/accounts':'/admin/');
    if(!u)return redirect(login);
    if(u.role!=='admin'){
     const username=u.username.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
     return send(403,'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>请切换管理员账号</title><body style="background:#0a1220;color:#e9f1ff;font:16px/1.8 sans-serif;padding:32px"><h1>当前登录的是代理账号</h1><p>当前账号：'+username+'。代理不能查看或审核其他代理申请。</p><p>请使用管理员账号 757029864 登录后进入审核页。</p><a style="color:#81edce" href="'+login+'">切换管理员登录 →</a><p><a style="color:#81edce" href="/agent/">返回代理中心</a></p></body></html>','text/html; charset=utf-8');
    }
    if(req.method==='GET'&&p==='/admin/inventory-bridge.js')return send(200,readFileSync(path.join(here,'inventory-bridge.js'),'utf8'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&p==='/admin/approvals.js')return send(200,readFileSync(path.join(here,'admin-approvals.js'),'utf8'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&p==='/admin/after-sales.js')return send(200,readFileSync(path.join(here,'admin-after-sales.js'),'utf8'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&p==='/admin/operations.js')return send(200,readFileSync(path.join(here,'admin-operations.js'),'utf8'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&p==='/admin/warehouse.js')return send(200,readFileSync(path.join(here,'admin-warehouse.js'),'utf8'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&p==='/admin/server-data.js')return send(200,readFileSync(path.join(here,'admin-server-data.js'),'utf8'),'text/javascript; charset=utf-8');
    if(options.productAdminPath&&['/admin/','/admin/index.html'].includes(p)&&req.method==='GET'){
     let html=readFileSync(options.productAdminPath,'utf8');
     html=html.replace('</head>','<style>'+readFileSync(path.join(here,'admin-approvals.css'),'utf8')+readFileSync(path.join(here,'tech-theme.css'),'utf8')+'</style></head>');
     html=html.replace(/<div class="notice">[\s\S]*?<\/div>/,'<div class="notice"><strong>管理员工作台 · 登录后访问</strong> 总仓、代理库存和订单由服务器统一保存。模拟付款仅流转DEMO卡密，不检测真实到账。</div>').replace('后台演示 · 无需登录','管理员 · 已验证').replace('演示管理员','管理员');
     html=html.replace(/<a\b[^>]*href="\/agent\/"[^>]*>[\s\S]*?<\/a>/g,'');
     html=html.replace(/(<section class="section" id="agents" hidden>)([\s\S]*?)(<\/section>)/,(_,open,body,close)=>open+'<div class="page-heading"><div><h1>代理管理</h1><p class="sub">代理自行注册；在这里审核申请、指定A/B/C类别并设置专属进货价。</p></div><button type="button" class="btn primary" id="approval-refresh">刷新申请</button></div><div id="approval-message" role="status" style="color:#ffd393;margin:16px 0"></div><div id="approval-agents"></div><div class="panel" style="padding:20px"><h2>代理进货订单</h2><div id="approval-procurements"></div></div><div hidden>'+body+'</div>'+close);
     html=html.replace(/(<button\b[^>]*\bid="(?:agent-new|quick-agent)")/g,'$1 hidden disabled');
     for(const [tab,title,kind,description] of [['orders','代理进货订单','proc','读取代理中心提交和模拟购买的最新服务器订单。'],['retail','买方订购订单','retail','读取买方最新订单，仅扣减所选代理服务器库存。'],['products','商品定价','prices','服务器零售价，保存后买方商城会使用最新价格。']]){
      const pattern=new RegExp('(<section class="section" id="'+tab+'" hidden>)([\\s\\S]*?)(</section>)');
      html=html.replace(pattern,(_,open,old,close)=>open+'<div class="page-heading"><div><h1>'+title+'</h1><p class="sub">'+description+'</p></div><button type="button" class="btn" id="server-'+kind+'-refresh">刷新</button></div><div id="server-'+kind+'-message" role="status" style="color:#f3d09a"></div>'+(kind==='prices'?'<div id="server-prices-list" class="panel" style="padding:20px"></div>':'<div class="panel"><div class="toolbar"><input id="server-'+kind+'-search" aria-label="搜索服务器'+title+'" placeholder="搜索订单、代理或商品"></div><div class="table-wrap"><table><thead><tr><th>订单 / 时间</th><th>代理账号</th><th>商品 / 数量</th><th>金额</th><th>状态</th></tr></thead><tbody id="server-'+kind+'-rows"></tbody></table></div><p id="server-'+kind+'-empty" class="cards-empty" hidden>暂无订单</p></div>')+'<div hidden>'+old+'</div>'+close);
     }
     const panels={cards:`<div class="page-heading"><div><h1>总仓库 · 服务器库存</h1><p class="sub">代理下单先占用；模拟付款后从总仓转入代理，库存不足不可进货。</p></div><button class="btn" id="warehouse-refresh">刷新库存</button></div><div id="warehouse-stats" class="stats"></div><p id="warehouse-message" role="status" style="color:#ffd393"></p><div class="panel" style="padding:24px;margin:20px 0"><h2>导入总仓演示卡密</h2><p class="sub">旧浏览器库存不会自动变为服务器库存。如有未分配的旧DEMO卡密，可先迁移。</p><button class="btn" id="warehouse-migrate">迁移本浏览器旧总仓库存</button><form id="warehouse-import"><label>商品<select id="warehouse-product"><option value="go">泰罗奥特曼Go</option><option value="plus">奥特之母Plus</option><option value="pro">奥特之父Pro</option></select></label><label>每行一条DEMO卡密，最多100条<textarea id="warehouse-codes" required placeholder="DEMO-GO-TEST-001" style="display:block;width:100%;min-height:110px;margin:12px 0"></textarea></label><button class="btn primary">导入总仓库</button></form></div><div class="panel" style="padding:20px"><div class="toolbar"><input id="warehouse-search" placeholder="搜索商品或卡密" aria-label="搜索总仓库"><select id="warehouse-status" aria-label="总仓状态"><option value="all">全部状态</option><option value="available">总仓可售</option><option value="reserved">订单占用</option><option value="allocated">已转入代理</option><option value="disabled">已停用</option></select></div><p class="sub">显示最新1000条，统计包含全部；旧代理库存保留，不会反向增加总仓。</p><div class="table-wrap"><table><thead><tr><th>商品</th><th>卡密</th><th>状态</th><th>操作 / 进货订单</th></tr></thead><tbody id="warehouse-rows"></tbody></table></div></div>`,overview:`<div class="page-heading"><div><h1>经营概览</h1><p class="sub">服务器总仓、代理进货与买方购买统一流转。所有支付均为模拟。</p></div></div><div class="stats" id="closed-overview"></div><div class="panel" style="padding:26px;margin-top:24px"><h2>库存流转</h2><p>总仓可售 → 代理下单占用 → 模拟付款转入代理 → 买方下单占用 → 模拟付款交付。</p><p>未付款订单5分钟自动到期，下一次查询或操作时释放；已交付订单不可取消，不重复发货。</p><a href="#cards">进入总仓补货 →</a></div>`,logs:`<div class="page-heading"><div><h1>服务器操作记录</h1><p class="sub">记录本次升级后的库存流转及管理变更，无法通过编辑浏览器修改。</p></div><button class="btn" id="server-audit-refresh">刷新记录</button></div><div class="panel table-wrap"><table><thead><tr><th>时间</th><th>操作方</th><th>动作</th><th>订单 / 参考</th></tr></thead><tbody id="server-audit-rows"></tbody></table></div>`,security:`<div class="page-heading"><h1>测试与安全边界</h1></div><div class="panel" style="padding:26px"><h2>当前为演示交易</h2><p>模拟付款不检测真实收款，只流转不可兑换的DEMO卡密。禁止导入真实卡密或据此真实收款发货。</p><h2>账号权限</h2><p>管理员首次注册后关闭入口；代理自行申请，管理员审核。代理仅能查看自己的资料、价格、库存和进货订单。</p><h2>上线前仍需完成</h2><p>真实支付回调验签与对账尚未接入。加密备份、买方账号、售后及双重验证功能已提供；管理员需亲自绑定身份验证器，并配置长期托管和异地备份。</p></div>`};
     panels.security+='<div class="panel" style="padding:24px;margin-top:24px"><h2>演示售后处理</h2><p class="sub">通过退单会作废已展示卡密，绝不重新上架。不发生真实退款。</p><button class="btn" id="after-sales-refresh">刷新售后</button><p id="after-sales-message" role="status"></p><div id="after-sales-list"></div><p><a href="/admin/accounts#runtime-security">双重验证与加密备份 →</a></p></div>';
     html=html.replace('安全与正式上线','售后与运行安全');
     for(const [id,body] of Object.entries(panels)){const pattern=new RegExp('(<section class="section" id="'+id+'"(?: hidden)?>)([\\s\\S]*?)(</section>)');html=html.replace(pattern,(_,open,old,close)=>open+body+'<div hidden>'+old+'</div>'+close)}
     html=html.replace('<body>','<body><div style="background:#152b38;color:#e5f4ff;padding:12px 24px;display:flex;gap:24px;flex-wrap:wrap"><strong>商品管理后台</strong><a href="/admin/#agents" style="color:#8de9d0">代理管理审核 →</a><a href="/" style="color:#8de9d0">返回商城</a><a href="/admin/accounts" style="color:#8de9d0">账号与退出登录</a><span>服务器统一库存 · 仅模拟支付</span></div>');
     html=html.replace('</body>','<script src="/admin/inventory-bridge.js" defer></script><script src="/admin/approvals.js" defer></script><script src="/admin/server-data.js" defer></script><script src="/admin/warehouse.js" defer></script><script src="/admin/after-sales.js" defer></script></body>');
     let policy=html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
     if(!policy)return send(500,{error:'商品后台策略缺失'});
     const before=policy;policy=policy.replace("script-src ","script-src 'self' ").replace("connect-src 'none'","connect-src 'self'");html=html.replace('content="'+before+'"','content="'+policy+'"');
     res.setHeader('Content-Security-Policy',policy+"; frame-ancestors 'none'");
     return send(200,html,'text/html; charset=utf-8');
    }
   }
   if(req.method==='GET'&&['/','/login','/agent/login','/register','/agent/register','/admin/','/admin/accounts','/agent/'].includes(p)){
    if(p==='/')return redirect(u?(u.role==='admin'?'/admin/':'/agent/'):'/login');
    if(p==='/register'&&db.prepare("SELECT id FROM users WHERE role='admin'").get())return redirect('/login');
    if(p==='/agent/'&&!u)return redirect('/agent/register');
    if(p==='/agent/'&&u.role!=='agent')return redirect('/agent/login');
    if(p==='/admin/'&&!u)return redirect('/login');
    if(p==='/admin/'&&u.role!=='admin')return send(403,'无权访问管理员后台','text/plain; charset=utf-8');
    return send(200,readFileSync(path.join(here,'page.html'),'utf8').replace('</body>',p==='/admin/accounts'?'<script src="/admin/operations.js" defer></script></body>':'</body>').replace('</head>','<style>'+readFileSync(path.join(here,'tech-theme.css'),'utf8')+'</style></head>'),'text/html; charset=utf-8');
   }
   if(req.method==='GET'&&p==='/api/setup')return send(200,{registrationOpen:!db.prepare("SELECT id FROM users WHERE role='admin'").get(),username:bootstrap.username});
   if(req.method==='GET'&&p==='/api/me')return u?send(200,{username:u.username,role:u.role,mfaEnabled:u.role==='admin'&&operations.mfaStatus(u.id).enabled,approval:u.approval,tier:u.approval==='approved'?u.tier:null,name:u.display_name,contact:u.contact,csrf:u.csrf}):send(401,{error:'请先登录'});
   if(req.method==='GET'&&p==='/api/agents')return u?.role==='admin'?send(200,db.prepare("SELECT id,username,display_name,contact,approval,tier,prices,active FROM users WHERE role='agent' ORDER BY id DESC").all().map(a=>({...a,prices:JSON.parse(a.prices)}))):send(u?403:401,{error:'无权访问'});
   if(req.method==='GET'&&p==='/api/after-sales')return u?.role==='admin'?send(200,afterSales.all()):send(u?403:401,{error:'仅管理员可查看售后单'});
   if(req.method==='GET'&&p==='/api/operations')return u?.role==='admin'?send(200,{backup:operations.status(),backups:operations.backups(),mfa:operations.mfaStatus(u.id)}):send(u?403:401,{error:'仅管理员可查看运行安全'});
   if(req.method==='GET'&&p.startsWith('/api/operations/backups/')){if(u?.role!=='admin')return send(u?403:401,{error:'无权下载备份'});const name=p.slice('/api/operations/backups/'.length);const bytes=operations.download(name);res.setHeader('Content-Disposition','attachment; filename="'+name+'"');return send(200,bytes.toString('utf8'),'application/octet-stream');}
   if(req.method==='GET'&&p==='/api/warehouse')return u?.role==='admin'?send(200,warehouse.snapshot()):send(u?403:401,{error:'仅管理员可查看总仓库'});
   if(req.method==='GET'&&p==='/api/audit')return u?.role==='admin'?send(200,warehouse.events()):send(u?403:401,{error:'仅管理员可查看操作记录'});
   if(req.method==='GET'&&p==='/api/catalog'){
    if(!u)return send(401,{error:'请先登录'});
    if(u.role!=='agent'||u.approval!=='approved')return send(403,{error:'需要管理员审核通过后才能查看进货价'});
    shop.cleanup();return send(200,{paymentMode:demoPayments?'demo':'disabled',afterSales:afterSales.own('procurement',u.id),warehouseStock:warehouse.stock(),tier:u.tier,prices:JSON.parse(u.prices),inventory:db.prepare('SELECT id,product,code,status,created,procurement_id FROM inventory WHERE user_id=? ORDER BY created DESC').all(u.id),orders:db.prepare('SELECT id,product,quantity,unit_cents,total_cents,status,created FROM procurements WHERE user_id=? ORDER BY created DESC LIMIT 100').all(u.id)});
   }
   if(req.method==='GET'&&p==='/api/procurements')warehouse.cleanup();
   if(req.method==='GET'&&p==='/api/procurements')return u?.role==='admin'?send(200,db.prepare('SELECT p.*,u.username FROM procurements p JOIN users u ON u.id=p.user_id ORDER BY created DESC LIMIT 100').all().map(({user_id,...o})=>o)):send(u?403:401,{error:'无权访问'});
   if(req.method!=='POST')return send(404,{error:'不存在的入口'});
   const expected=options.origin||process.env.PUBLIC_ORIGIN||`http://127.0.0.1:${server.address().port}`;
   if(req.headers.origin!==expected)return send(403,{error:'请求来源不符'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'仅接受 JSON'});
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>(['/api/inventory/import','/api/warehouse/import'].includes(p)?65536:4096))return send(413,{error:'请求过大'})}let b;try{b=JSON.parse(raw)}catch{return send(400,{error:'请求无效'})}
   if(!b||Array.isArray(b)||typeof b!=='object')return send(400,{error:'请求无效'});
   u=session(req); // Recheck after reading the body: permissions or sessions may have changed while awaiting data.
   if(['/api/shop/orders','/api/procurements/create'].includes(p)&&!rate('order:'+clientIP(req),30))return send(429,{error:'下单过于频繁，请稍后重试'});
   if(p.startsWith('/api/customer/')){if(!operations.rate('customer:'+clientIP(req),20)||(b.username&&!operations.rate('customer-name:'+String(b.username).toLowerCase(),10)))return send(429,{error:'买方账户操作过于频繁，请15分钟后重试'});if(p==='/api/customer/register'&&!operations.rate('signup:'+clientIP(req),5,3600000))return send(429,{error:'此网络注册次数过多，请稍后重试'});return send(200,shop.customerPost(req,res,p,b));}
   if(['/api/shop/orders','/api/shop/simulate','/api/shop/cancel','/api/shop/after-sales'].includes(p))return send(200,shop.post(req,res,p,b,hash(clientIP(req))));
   if(['/api/register','/api/login','/api/agent-register'].includes(p)){
    if(!rate(clientIP(req)+':'+p))return send(429,{error:'尝试过于频繁，请15分钟后重试'});
    if(typeof b.username!=='string'||b.username.length>30||typeof b.password!=='string'||b.password.length>128)return send(400,{error:'请填写账号密码'});
    if(p==='/api/agent-register'){
     if(!operations.rate('signup:'+clientIP(req),5,3600000))return send(429,{error:'此网络注册次数过多，请稍后重试'});if(db.prepare("SELECT COUNT(*) n FROM users WHERE role='agent' AND approval='pending'").get().n>=250)return send(429,{error:'待审核申请较多，请联系管理员'});
     if(!/^[A-Za-z0-9_-]{1,30}$/.test(b.username)||b.username===bootstrap.username||!passOK(b.password)||typeof b.name!=='string'||!b.name.trim()||b.name.length>50||typeof b.contact!=='string'||!b.contact.trim()||b.contact.length>100)return send(400,{error:'请填写有效账号、至少12位密码、姓名和联系方式'});
     if(db.prepare('SELECT id FROM users WHERE username=?').get(b.username))return send(409,{error:'该账号已注册，请直接登录'});
     const id=db.prepare("INSERT INTO users(username,role,password,approval,display_name,contact) VALUES(?,'agent',?,'pending',?,?)").run(b.username,encodePassword(b.password),b.name.trim(),b.contact.trim()).lastInsertRowid;
     issue(res,db.prepare('SELECT * FROM users WHERE id=?').get(id));return send(201,{role:'agent',approval:'pending'});
    }
    if(p==='/api/register'){
     if(!bootstrap.passwordHash)return send(503,{error:'尚未配置管理员注册验证'});
     if(b.username!==bootstrap.username||!passOK(b.password)||!verify(b.password,bootstrap.passwordHash))return send(400,{error:'预留账号或注册验证密码不正确'});
     db.exec('BEGIN IMMEDIATE');let newId;try{if(db.prepare("SELECT id FROM users WHERE role='admin'").get()){db.exec('ROLLBACK');return send(409,{error:'管理员已注册，入口已关闭'})}newId=db.prepare("INSERT INTO users(username,role,password) VALUES(?,'admin',?)").run(b.username,encodePassword(b.password)).lastInsertRowid;db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}issue(res,db.prepare('SELECT * FROM users WHERE id=?').get(newId));return send(201,{role:'admin'});
    }
    const found=db.prepare('SELECT * FROM users WHERE username=?').get(b.username);
    const encoded=found?.password||dummyPassword;
    const valid=verify(b.password,encoded);if(!found||!valid||!found.active)return send(401,{error:'账号或密码不正确，或账号已停用'});if(b.portal==='agent'&&found.role!=='agent')return send(403,{error:'这里是代理入口，请使用代理自己的账号登录'});if(b.portal==='admin'&&found.role!=='admin')return send(403,{error:'这里是管理员后台，请使用管理员账号；代理请从商城的代理中心登录'});if(found.role==='admin'&&operations.mfaStatus(found.id).enabled&&!operations.verifyOTP(found.id,b.otp))return send(403,{error:'请输入身份验证器的动态验证码，或一条未使用的恢复码',mfaRequired:true});issue(res,found);warehouse.log(found.username,'auth.login');return send(200,{role:found.role});
   }
   if(!u)return send(401,{error:'请先登录'});
   if(req.headers['x-csrf-token']!==u.csrf)return send(403,{error:'安全校验失败，请刷新页面'});
   if(p.startsWith('/api/procurements/')){
    if(u.role!=='agent'||u.approval!=='approved')return send(403,{error:'需要管理员审核通过'});
    if(p==='/api/procurements/return')return send(200,afterSales.request('procurement',b.id,String(u.id),u.username,b.reason));
    if(!demoPayments&&['/api/procurements/create','/api/procurements/simulate'].includes(p))return send(503,{error:'尚未接入真实支付，正式配置已关闭模拟购买'});
    if(p==='/api/procurements/create')return send(201,warehouse.create(u,b));
    if(['/api/procurements/simulate','/api/procurements/paid','/api/procurements/cancel'].includes(p))return send(200,warehouse.operate(u,p,b));
    return send(404,{error:'不存在的进货入口'});
   }
   if(p==='/api/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(u.token);res.setHeader('Set-Cookie',`sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`);return send(200,{ok:true})}
   if(p==='/api/password'){
    if(!rate('password:'+u.id))return send(429,{error:'密码尝试过于频繁，请稍后重试'});
    if(u.role==='admin'&&operations.mfaStatus(u.id).enabled&&!operations.verifyOTP(u.id,b.otp))return send(403,{error:'修改密码还需填写动态验证码或恢复码'});
    const row=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);if(!verify(String(b.oldPassword||''),row.password)||!passOK(b.password))return send(400,{error:'原密码不正确或新密码不足12位'});
    db.prepare('UPDATE users SET password=?,version=version+1 WHERE id=?').run(encodePassword(b.password),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);return send(200,{ok:true,relogin:true});
   }
   if(u.role!=='admin')return send(403,{error:'仅管理员可操作'});
   if(p==='/api/after-sales/decide')return send(200,afterSales.decide(u,b));
   if(p.startsWith('/api/operations/')||p.startsWith('/api/mfa/')){
    if(!rate('operations:'+u.id,10))return send(429,{error:'安全操作过于频繁，请稍后重试'});
    if(p==='/api/operations/mirror'){const last=operations.backups()[0];if(!last)return send(409,{error:'请先创建备份'});await operations.mirror(last.name);return send(200,operations.status());}
    if(p==='/api/operations/backup'){const result=operations.backup();warehouse.log(u.username,'backup.created',result.name);return send(200,result);}
    const account=db.prepare('SELECT password FROM users WHERE id=?').get(u.id);
    if(!verify(String(b.password||''),account.password))return send(403,{error:'请先验证当前管理员密码'});
    if(p==='/api/mfa/setup')return send(200,operations.setupMFA(u));
    if(p==='/api/mfa/enable'){const codes=operations.enableMFA(u,b.otp);if(!codes)return send(400,{error:'验证码不正确或设置已过期'});warehouse.log(u.username,'mfa.enabled');return send(200,{codes});}
    if(!operations.verifyOTP(u.id,b.otp))return send(403,{error:'动态验证码或恢复码无效'});
    if(p==='/api/operations/key'){warehouse.log(u.username,'backup.key_exported');return send(200,{key:operations.keyExport()});}
    if(p==='/api/mfa/recovery'){const codes=operations.regenerateRecovery(u.id);warehouse.log(u.username,'mfa.recovery_rotated');return send(200,{codes});}
    if(p==='/api/mfa/disable'){operations.disableMFA(u.id);warehouse.log(u.username,'mfa.disabled');return send(200,{ok:true,relogin:true});}
    return send(404,{error:'不存在的安全操作'});
   }
   if(p==='/api/warehouse/import')return send(200,warehouse.importCards(b.cards,u.username));
   if(p==='/api/warehouse/toggle')return send(200,warehouse.toggle(b.id,b.enabled,u.username));
   if(p==='/api/retail-prices'){const out=shop.savePrices(b.prices);warehouse.log(u.username,'prices.updated');return send(200,out);}
   if(p==='/api/inventory/import'){
    if(!Array.isArray(b.cards)||!b.cards.length||b.cards.length>100)return send(400,{error:'每批可同步1–100条演示库存'});
    const planned=[],seen=new Set();
    for(const c of b.cards){
     if(!c||typeof c.username!=='string'||!['go','plus','pro'].includes(c.product)||!/^DEMO-[A-Z0-9_-]{3,80}$/.test(c.code)||!['available','sold','disabled'].includes(c.status)||seen.has(c.code))return send(400,{error:'库存格式不正确或重复，仅可同步DEMO-演示卡密'});
     seen.add(c.code);const owner=db.prepare("SELECT id FROM users WHERE username=? AND role='agent' AND approval='approved' AND active=1").get(c.username);
     if(!owner)return send(400,{error:'代理不存在、未批准或已停用：'+c.username});
     if(db.prepare('SELECT id FROM warehouse WHERE code=?').get(c.code))return send(409,{error:'此卡密已在总仓库中，请通过代理进货流转，不能重复导入代理库存'});
     const old=db.prepare('SELECT * FROM inventory WHERE code=?').get(c.code);
     if(old?.status==='reserved')return send(409,{error:'卡密已被买方订单占用，不能覆盖'});
     if(old&&(old.user_id!==owner.id||old.product!==c.product))return send(409,{error:'已有卡密的归属或商品不同，不能覆盖'});
     if(old&&old.status==='sold'&&c.status!=='sold')return send(409,{error:'已售卡密不能重新变为可售'});
     planned.push({c,owner,old});
    }
    db.exec('BEGIN IMMEDIATE');try{for(const {c,owner,old} of planned){if(old)db.prepare('UPDATE inventory SET status=? WHERE id=?').run(c.status,old.id);else db.prepare('INSERT INTO inventory(id,user_id,product,code,status,created) VALUES(?,?,?,?,?,?)').run(randomBytes(16).toString('hex'),owner.id,c.product,c.code,c.status,Date.now())}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
    warehouse.log(u.username,'inventory.legacy_import',String(planned.length));return send(200,{count:planned.length});
   }
   if(p==='/api/agents/create'){
    if(!/^[A-Za-z0-9_-]{1,30}$/.test(b.username||'')||!passOK(b.password)||b.username===bootstrap.username)return send(400,{error:'代理账号须为1–30位字母、数字或_-；密码至少12位'});
    if(db.prepare('SELECT id FROM users WHERE username=?').get(b.username))return send(409,{error:'账号已存在'});
    db.prepare("INSERT INTO users(username,role,password) VALUES(?,'agent',?)").run(b.username,encodePassword(b.password));return send(201,{ok:true});
   }
   if(p==='/api/agents/update'){
    const agent=db.prepare("SELECT * FROM users WHERE id=? AND role='agent'").get(Number(b.id));if(!agent)return send(404,{error:'找不到代理'});
    if(b.password!==undefined&&!passOK(b.password))return send(400,{error:'新密码至少12位'});
    if(b.active!==undefined&&typeof b.active!=='boolean')return send(400,{error:'状态无效'});
    if(b.tier!==undefined&&!['A','B','C'].includes(b.tier))return send(400,{error:'代理类别只能为A、B、C'});
    if(b.approval!==undefined&&!['pending','approved','rejected'].includes(b.approval))return send(400,{error:'审核状态无效'});
    if(b.prices!==undefined&&(!b.prices||Object.keys(b.prices).length!==3||!['go','plus','pro'].every(k=>typeof b.prices[k]==='number'&&Number.isFinite(b.prices[k])&&b.prices[k]>=0&&b.prices[k]<=99999&&Math.abs(b.prices[k]*100-Math.round(b.prices[k]*100))<1e-6)))return send(400,{error:'三款进货价须为0–99999，最多两位小数'});
    db.prepare('UPDATE users SET approval=?,prices=?,tier=? WHERE id=?').run(b.approval??agent.approval,b.prices?JSON.stringify(b.prices):agent.prices,b.tier??agent.tier,agent.id);
    const revoke=b.password!==undefined||(b.active!==undefined&&Number(b.active)!==agent.active);
    db.prepare('UPDATE users SET password=?,active=?,version=version+? WHERE id=?').run(b.password?encodePassword(b.password):agent.password,b.active===undefined?agent.active:Number(b.active),revoke?1:0,agent.id);if(revoke)db.prepare('DELETE FROM sessions WHERE user_id=?').run(agent.id);warehouse.log(u.username,'agent.updated',agent.username);warehouse.cleanup();shop.cleanup();return send(200,{ok:true});
   }
   return send(404,{error:'不存在的入口'});
  }catch(e){if(!res.headersSent)send(e.status||500,{error:e.status?e.message:'服务处理失败'});else res.end()}
 });
 const maintenance=setInterval(()=>{try{warehouse.cleanup();shop.cleanup();db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('DELETE FROM customer_sessions WHERE expires<=?').run(Date.now())}catch{console.error('Scheduled maintenance failed')}},60000);maintenance.unref();
 if(options.backups!==false)operations.backup();
 server.on('close',()=>{clearInterval(maintenance);operations.close();db.close()});return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createAccountServer();server.listen(Number(process.env.PORT||10001),'0.0.0.0',()=>console.log('Account server ready'))}
