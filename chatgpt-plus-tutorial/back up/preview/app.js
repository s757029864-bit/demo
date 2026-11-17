const $=id=>document.getElementById(id),labels={pending:'待付款',review:'待人工核实，请勿重复付款',paid:'已确认到账，等待发货，请勿重复付款',fulfilled:'已确认到账并发货',cancelled:'订单已取消，如已付款请联系客服',refunded:'已登记人工退款，请联系客服核对实际到账'};
const money=c=>'¥'+(c/100).toFixed(2);let csrf='',current=null,orderList=[];
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function message(text,error=false){const output=$('message')||$('catalog-message');if(output){output.textContent=text;output.className=error?'error':'status';}}
async function api(url,body,secret){const r=await fetch(url,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...(secret?{Authorization:'Bearer '+secret}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'请求失败');if(data.csrf)csrf=data.csrf;return data;}
async function task(fn,button){if(button)button.disabled=true;try{message('');await fn();}catch(e){message(e.message,true);}finally{if(button)button.disabled=false;}}
function saved(){try{return JSON.parse(localStorage.getItem('manual-orders')||'[]');}catch{return [];}}
function save(o){try{localStorage.setItem('manual-orders',JSON.stringify([o,...saved().filter(x=>x.id!==o.id)].slice(0,30)));}catch{message('浏览器无法保存记录，请复制私密订单链接并自行保管。',true);}}
function privateLink(){return location.origin+'./checkout.html#'+new URLSearchParams(current).toString();}
async function copy(text){try{await navigator.clipboard.writeText(text);message('已复制');}catch{message('无法自动复制，请手动选择并复制。',true);}}
async function refresh(){if(!current)return;const o=await api('/api/orders/'+encodeURIComponent(current.id),null,current.secret);$('order-panel').hidden=false;$('create-panel').hidden=true;$('order-id').textContent='订单号：'+o.id;$('order-product').textContent=o.name;$('order-total').textContent=money(o.cents);$('order-status').textContent=labels[o.status];$('payment-panel').hidden=o.status!=='pending';$('delivery-panel').hidden=o.status!=='fulfilled';$('delivery-code').textContent=o.code||'';$('lookup-panel').open=false;save({...current,name:o.name});await loadSupport();}
function useOrder(o){current={id:o.id,secret:o.secret};history.replaceState(null,'',privateLink());return refresh();}
function shopSettings(settings){document.querySelectorAll('[data-shop-contact]').forEach(x=>x.textContent='微信客服：'+settings.contact);document.querySelectorAll('[data-shop-name]').forEach(x=>x.textContent=settings.shopName);if($('shop-announcement'))$('shop-announcement').textContent=settings.announcement;}
async function shop(){const {products,settings}=await api('/api/products');shopSettings(settings);for(const p of products){const card=node('article',undefined,'product');card.append(node('p',p.category==='google'?'@ 谷歌账号':p.category==='sms'?'# 接码服务':'⌘ CODEX','muted'),node('h2',p.name),node('p',money(p.cents),'price'));if(p.description)card.append(node('p',p.description,'muted'));const a=node('a','微信下单','button');a.href='./checkout.html?product='+encodeURIComponent(p.id);card.append(a);$('products').append(card);}}
async function checkout(){const data=await api('/api/products'),{products}=data,p=products.find(x=>x.id===new URLSearchParams(location.search).get('product'));shopSettings(data.settings);if(p){$('create-panel').hidden=false;$('product-name').textContent=p.name;$('product-price').textContent=money(p.cents);}else if(new URLSearchParams(location.search).has('product'))message('商品已下架或不存在，请返回商品页面重新选择。',true);const params=new URLSearchParams(location.hash.slice(1));if(params.get('id')&&params.get('secret')){current={id:params.get('id'),secret:params.get('secret')};await task(refresh);}
 $('create-form').onsubmit=e=>{e.preventDefault();task(async()=>{if(!p)throw Error('请选择有效商品');const o=await api('/api/orders',{product:p.id,expectedCents:p.cents,contact:new FormData(e.target).get('contact'),channel:'wechat'});save({id:o.id,secret:o.secret,name:o.name});await useOrder(o);},e.submitter);};
 $('lookup-form').onsubmit=e=>{e.preventDefault();task(async()=>{current=null;$('order-panel').hidden=true;const root=$('saved-orders');root.replaceChildren();const {orders}=await api('/api/orders/lookup',{contact:String(new FormData(e.target).get('contact')).trim()});if(!orders.length){root.append(node('p','未找到对应订单，请核对联系信息。'));return;}root.append(node('h2','你的订单'));for(const o of orders){const card=node('div',undefined,'panel');card.append(node('p',o.name+' · '+money(o.cents)),node('p','订单号：'+o.id),node('p',labels[o.status]));const local=saved().find(x=>x.id===o.id&&x.secret);if(local){const btn=node('button','查看订单详情');btn.type='button';btn.onclick=()=>task(()=>useOrder(local),btn);card.append(btn);}else card.append(node('p','查看卡密请打开保存的私密订单链接，或联系客服核实。','muted'));root.append(card);}},e.submitter);};
 $('paid-button').onclick=e=>task(async()=>{await api('/api/orders/'+current.id+'/paid',{},current.secret);await refresh();message('已提交，请等待客服核实到账。');},e.target);
 $('refresh-order').onclick=e=>task(refresh,e.target);$('copy-link').onclick=()=>copy(privateLink());$('copy-code').onclick=()=>copy($('delivery-code').textContent);
 $('support-form').onsubmit=e=>{e.preventDefault();task(async()=>{await api('/api/orders/'+current.id+'/support',{reason:new FormData(e.target).get('reason')},current.secret);e.target.reset();await loadSupport();message('售后申请已提交');},e.submitter);};
 setInterval(()=>{if(current&&!document.hidden)task(refresh);},20000);
}
async function loadSupport(){const {tickets}=await api('/api/orders/'+current.id+'/support',null,current.secret);const root=$('support-list');root.replaceChildren();for(const t of tickets){const card=node('div',undefined,'panel');card.append(node('p',t.status==='open'?'待客服处理':'已处理','status'),node('p',t.reason),node('p','客服回复：'+(t.reply||'暂未回复')));root.append(card);}}
async function portal(){
 const dialog=document.querySelector('dialog');
 document.querySelectorAll('[data-title]').forEach(b=>b.addEventListener('click',()=>{$('dialog-title').textContent=b.dataset.title;$('dialog-message').textContent=b.dataset.message;dialog.showModal();}));
 const category=new URLSearchParams(location.search).get('category');
 if($('agent-nav'))$('agent-nav').hidden=Boolean(category);
 if(!category){const notice=$('shop-notice');if(notice){notice.addEventListener('cancel',e=>e.preventDefault());notice.showModal();}return;}
 const names={chatgpt:'购买 ChatGPT',google:'购买谷歌账号',sms:'购买接码',skills:'常用skills购买'};if(!Object.hasOwn(names,category)){message('商品分类不存在');return;}
 $('portal-main').hidden=true;$('catalog-main').hidden=false;document.title=names[category];
 const hero=$('catalog-main').querySelector('.visual-hero');hero.querySelector('h1').textContent=names[category];hero.querySelector('.eyebrow').textContent=category.toUpperCase()+' / COLLECTION';hero.querySelector('.lead').textContent=category==='skills'?'精选实用 Skills，帮助你提高日常工作效率。':category==='chatgpt'?'四款商品，选择适合你的套餐。':category==='google'?'个人新号与个人老号，按需选择。':'美区接码，¥5/个。';
 const {products,settings}=await api('/api/products');shopSettings(settings);const entries=products.filter(p=>p.category===category),root=$('products');root.classList.toggle('two',category==='google');root.classList.toggle('single',category==='sms');
 for(const [i,p] of entries.entries()){
  const card=$('product-template').content.firstElementChild.cloneNode(true);card.querySelector('h2').textContent=p.name;card.querySelector('.tier').textContent=String(i+1).padStart(2,'0')+' / '+(category==='chatgpt'?'CODEX':category==='google'?'GOOGLE':'SMS');card.querySelector('.codex-mark span').textContent=category==='chatgpt'?'CODEX':category==='google'?'GOOGLE':'SMS';
  card.querySelector('.price').replaceChildren(node('small','¥'),document.createTextNode((p.cents/100).toLocaleString('zh-CN',{maximumFractionDigits:2})));
  if(category==='skills'){card.append(node('p','库存：'+p.stock+' 份','product-meta'));card.querySelector('.codex-mark span').textContent='SKILLS';}
  if(p.description){const description=node('p',p.description,'subtitle');card.querySelector('h2').after(description);}
  for(const b of card.querySelectorAll('.pay-option')){b.removeAttribute('data-product');b.removeAttribute('data-amount');if(p.sale_stock===0){b.disabled=true;b.textContent='暂时售罄';}b.onclick=()=>{if(b.classList.contains('wechat'))location.href='./checkout.html?product='+encodeURIComponent(p.id);else{$('dialog-title').textContent='支付宝';$('dialog-message').textContent='该支付方式暂未开放，请使用微信支付。';dialog.showModal();}};}
  root.append(card);
 }
 if(!entries.length){root.append(node('p',category==='skills'?'Skills 商品即将上架，欢迎添加微信 sxzhaoniu 咨询。':'暂无上架商品，请稍后再来。','lead'));}
}
task(()=>({shop,checkout,portal}[document.body.dataset.page])());
