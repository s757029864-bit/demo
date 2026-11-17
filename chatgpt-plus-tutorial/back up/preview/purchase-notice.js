const purchaseCategory=new URLSearchParams(location.search).get('category');
const purchaseProduct=new URLSearchParams(location.search).get('product');
if((location.pathname.endsWith('/index.html')&&purchaseCategory==='chatgpt')||(location.pathname==='/checkout'&&purchaseProduct==='plus')){
 const sections=[
 ['一、商品与使用说明',[
 '本商品为充值至你本人账号的订阅服务，不包含成品账号。请提前准备由本人合法持有并正常使用的账号；如需谷歌账号，请以店内对应商品的当前售价及说明为准。',
 '使用 ChatGPT、Codex 前，请自行确认所在地区的服务可用性、网络条件及官方使用要求。Codex 的可用套餐、登录与手机号验证要求以官方当前规则为准，购买 Plus 不代表保证跳过手机号验证。',
 '本商品使用菲区卡密，请在购买前向客服确认适用地区、套餐及充值方式。历史交付情况不构成对未来稳定性、账号安全或订阅状态的保证。'
 ]],
 ['二、售后服务范围',[
 '充值成功后，提供 30 天订阅售后协助；订阅状态及具体处理结果以官方规则和核实结果为准。',
 '正常订阅成功后，可前往账号账单页面查看是否提供 Invoice / Receipt，并按官方页面指引下载。官方账单凭证与本店开具的发票并非同一文件。',
 '如遇订阅异常，请及时提供订单号及必要的异常截图。客服将协助排查；需官方介入的，以官方核实与最终处理结果为准。'
 ]],
 ['三、可能影响售后处理的情况',[
 '账号原有订阅冲突；存在异常零元充值或异常订阅历史。',
 '账号为购买、租赁、共享或来源不明的账号；存在中转、反代、异常认证、违规共享等非个人正常使用行为。',
 '因账号自身状态或违规使用触发官方风控、限制或封禁。',
 '上述情况造成的、可归因于账号或使用行为的问题，不纳入本店通常的订阅售后承诺；具体责任和处理方式需核实，不以本条免除本店自身原因造成的问题。'
 ]],
 ['四、下单前的账号检查',[
 '确认账号没有正在生效的 GO / PLUS / PRO 等订阅。',
 '确认账号没有异常零元充值或异常订阅记录。',
 '曾通过 iOS、Google Play 等手机渠道订阅的，请确认原订阅已彻底到期、已关闭自动续费，并向客服确认适合的充值时间。',
 '已加入 TEAM / BUSINESS 工作区的，请先联系客户服务核实账号与充值方式是否兼容；涉及退出团队或工作区时，请自行确认数据与权限影响后操作。'
 ]],
 ['五、退款说明',[
 '本商品属于数字订阅服务。充值成功后，非质量问题、非本店责任的情况，原则上不支持退款。请在付款前确认账号、套餐及购买意愿。',
 '尚未交付、重复付款、因本店原因无法完成交付或存在交付问题的，请联系客服核实处理；依法应予退款的情形不受上述限制。售后协助不等同于承诺全额退款。'
 ]]
 ,['售后联系',['购买后如有任何问题，请联系微信：sxzhaoniu。']]
 ];
 const modal=document.createElement('dialog');modal.id='purchase-notice';modal.setAttribute('aria-labelledby','purchase-notice-title');
 const title=document.createElement('h2');title.id='purchase-notice-title';title.tabIndex=-1;title.textContent='ChatGPT 购买须知';modal.append(title);
 const intro=document.createElement('p');intro.className='purchase-notice-intro';intro.textContent='请在下单前认真阅读，确认账号条件、交付内容与售后规则。';modal.append(intro);
 const body=document.createElement('div');body.className='purchase-notice-body';
 for(const [heading,paragraphs] of sections){const section=document.createElement('section');const h=document.createElement('h3');h.textContent=heading;section.append(h);for(const text of paragraphs){const p=document.createElement('p');p.textContent=text;section.append(p);}body.append(section);}modal.append(body);
 const form=document.createElement('form');form.method='dialog';const button=document.createElement('button');button.className='notice-confirm';button.textContent='我已阅读并知晓';form.append(button);modal.append(form);modal.addEventListener('cancel',e=>e.preventDefault());document.body.append(modal);modal.showModal();title.focus({preventScroll:true});modal.scrollTop=0;
}
