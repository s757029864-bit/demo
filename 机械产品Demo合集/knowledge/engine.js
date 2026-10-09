(function (root) {
  'use strict';
  const devices = [{id:'mx',name:'MX-200 数控加工中心',short:'MX-200'}, {id:'ac',name:'AC-30 空压机',short:'AC-30'}, {id:'bc',name:'BC-200 皮带输送机',short:'BC-200'}];
  const docs = [
    {id:'mx-guide',device:'mx',title:'MX-200 操作与参数手册',version:'示例 v1.0',sample:true,sections:[
      {id:'mx-params',section:'1.1 设备参数',tags:['主轴','转速','参数','功率'],text:'MX-200 为虚构的教学设备。示例主轴额定功率为 5.5 kW，主轴转速范围为 100—6000 r/min。上述数值仅用于问答演示，不对应真实设备。'},
      {id:'mx-start',section:'2.1 开机前检查',tags:['开机','启动','检查','准备'],text:'示例开机检查清单：确认作业区域整洁；核对设备状态记录；确认防护装置状态；检查润滑与冷却液的显示状态。实际开机应由合格人员按真实设备操作规程执行。'},
      {id:'mx-e101',section:'3.1 E101 状态提示',tags:['e101','门禁','安全门','报警'],text:'在本示例设备中，E101 表示安全门状态未确认，系统暂停执行加工任务。应记录发生时间与界面提示，交由授权人员按实际手册检查。不得绕过门禁或安全联锁。'},
      {id:'mx-e202',section:'3.2 E202 状态提示',tags:['e202','冷却液','液位'],text:'在本示例设备中，E202 表示冷却液液位提示。记录报警代码与显示液位，按真实设备要求由授权人员处理。本文档未规定液体型号、补充量或复位步骤。'}
    ]},
    {id:'mx-service',device:'mx',title:'MX-200 维护与记录规范',version:'示例 v1.0',sample:true,sections:[
      {id:'mx-daily',section:'1.1 日常记录',tags:['日常','保养','维护','点检','润滑'],text:'示例日常记录包含设备编号、运行时长、润滑状态、冷却液显示状态和异常备注。每个工作日结束后由值班人员补齐记录；发现异常时转交设备负责人。本文档不提供拆卸或带电检修指导。'},
      {id:'mx-ticket',section:'2.1 报修字段',tags:['报修','工单','上报','故障记录'],text:'MX-200 报修记录应包含设备编号、故障现象、发生时间、报警代码、影响范围和联系人。未观察到的内容填写“未知”，不要推断故障根因；附上允许分享的界面截图。'}
    ]},
    {id:'ac-guide',device:'ac',title:'AC-30 设备与状态说明',version:'示例 v1.0',sample:true,sections:[
      {id:'ac-params',section:'1.1 设备参数',tags:['参数','功率','压力','排气'],text:'AC-30 为虚构的教学设备。示例额定功率为 7.5 kW，额定排气压力为 0.8 MPa。示例数值不能用于真实设备选型、设置或运行。'},
      {id:'ac-e101',section:'2.1 E101 状态提示',tags:['e101','温度','报警','过热'],text:'在 AC-30 示例设备中，E101 表示排气温度状态异常。应记录代码、界面显示值和发生时间，并转交授权人员。相同报警代码在不同设备上的含义不同，不能套用其他机型的结论。'},
      {id:'ac-check',section:'3.1 巡检记录',tags:['巡检','日常','保养','维护','检查'],text:'AC-30 示例巡检记录包含运行时长、界面压力与温度读数、异常声音备注和报修编号。资料未提供保养周期、阈值设置或拆机步骤；这些问题需要查询真实设备手册。'}
    ]},
    {id:'ac-ticket-doc',device:'ac',title:'AC-30 报修资料规范',version:'示例 v1.0',sample:true,sections:[
      {id:'ac-ticket',section:'1.1 报修字段',tags:['工单','报修','上报','故障记录'],text:'AC-30 报修工单包含设备型号与编号、故障现象、发生时间、显示代码、影响范围和联系人。设备未提供的数据应标记“未知”，保留原始描述，交由维修负责人确认。'}
    ]}
  ];
  docs.push(
    {id:'mx-observe',device:'mx',title:'MX-200 异常现象与交接指南',version:'示例 v1.1',sample:true,sections:[
      {id:'mx-noise',section:'1.1 异响与振动记录',tags:['异响','振动','抖动','声音'],text:'出现新异响或明显振动时，记录发生时间、任务阶段、持续情况以及从安全位置可判断的大致区域。不要打开防护罩、靠近旋转部件或触碰运行设备查找声源。存在明显现场风险时，停止自助查询并联系现场负责人。'},
      {id:'mx-quality',section:'1.2 质量偏差记录',tags:['精度','尺寸','表面','质量','偏差'],text:'质量偏差记录应包含任务或工件编号、要求值、实测值、测量方式、出现频率及近期工装或程序变更。没有数据的字段填写“未知”。这些信息只能辅助受理，不能直接判断机械、工艺或控制系统的故障根因。'},
      {id:'mx-network',section:'1.3 通讯异常记录',tags:['通讯','通信','连接','传输','网络'],text:'记录完整错误提示、任务时间、本机功能与远程数据是否同时异常、最近网络或软件变更。不要自行修改 PLC 程序、屏蔽安全输入或恢复出厂设置。'},
      {id:'mx-warranty',section:'2.1 保修与配件咨询',tags:['保修','配件','合同','序列号'],text:'保修或配件咨询需提供型号、序列号、购买或验收资料，以及已有维修记录。保修资格、配件适配和收费范围由真实供应商按合同核验。MX-200 是虚构示例机型，不对应真实服务承诺。'}
    ]},
    {id:'ac-observe',device:'ac',title:'AC-30 气路与服务信息指南',version:'示例 v1.1',sample:true,sections:[
      {id:'ac-pressure',section:'1.1 压力异常记录',tags:['压力异常','压力不足','供气','气压','漏气'],text:'压力或供气异常时，记录界面已有的压力值、单位、时间、受影响设备范围及同期用气变化。有历史正常记录时一并提供。不要用手查漏或打开带压管路；不明泄漏或喷溅应交由现场负责人处理。'},
      {id:'ac-noise',section:'1.2 声音与振动记录',tags:['异响','振动','噪音','声音'],text:'从安全位置记录异常声音出现的阶段、是否持续、是否与负载变化相关及大致区域。不能通过触摸运行设备或拆开护罩来定位声音。资料没有提供故障根因判断。'},
      {id:'ac-filter',section:'2.1 滤芯与保养记录',tags:['滤芯','更换周期','耗材','保养周期'],text:'滤芯型号、更换周期和耗材要求应以真实设备手册及维保合同为准。本示例没有给出周期数值。咨询前准备型号、序列号、运行时长和已有保养记录，不清楚的字段保留为“未知”。'},
      {id:'ac-warranty',section:'2.2 保修资料',tags:['保修','合同','序列号','配件'],text:'准备设备型号、序列号、购买凭证与历史维修记录。保修起算日、范围、例外与费用均需由实际厂商核验，不能只凭运行时长或故障现象判断。'}
    ]},
    {id:'bc-guide',device:'bc',title:'BC-200 设备与状态说明',version:'示例 v1.1',sample:true,sections:[
      {id:'bc-params',section:'1.1 示例设备范围',tags:['参数','规格','型号','输送'],text:'BC-200 是虚构皮带输送机，示例范围包括驱动、输送带、滚筒及控制系统。资料没有提供额定速度、带宽、功率或载荷数值，不能用于选型和实际运行。'},
      {id:'bc-e101',section:'2.1 E101 状态提示',tags:['e101','报警','保护'],text:'在 BC-200 示例中，E101 表示输送段保护状态未确认。记录完整界面提示、发生区段、物料状态和上下游影响。不得绕过联锁或进入输送机构查看卡点。相同代码不能跨机型套用。'},
      {id:'bc-deviation',section:'2.2 跑偏与打滑记录',tags:['跑偏','打滑','偏移','皮带'],text:'在安全位置记录跑偏区段、出现频率、物料状态和最近维护变化。不要据此调整张紧、触碰运行输送带或进入设备区域。是否涉及张紧、滚筒或其他部件需要授权人员依据真实规程核验。'},
      {id:'bc-noise',section:'2.3 异响与振动记录',tags:['异响','振动','滚筒','声音'],text:'记录异常发生的区段和运行阶段，可使用已有区域编号描述位置。不要贴近滚筒、触摸运行部件或越过防护设施取证。'}
    ]},
    {id:'bc-service',device:'bc',title:'BC-200 点检与服务交接',version:'示例 v1.1',sample:true,sections:[
      {id:'bc-daily',section:'1.1 日常点检记录',tags:['日常','点检','巡检','保养','维护'],text:'示例点检记录包含设备编号、班次、界面状态、从安全位置可见的异常及交接备注。异常项目应交给设备负责人；本文不提供拆卸、张紧调整或传感器测试步骤。'},
      {id:'bc-ticket',section:'2.1 报修字段',tags:['报修','工单','上报','交接'],text:'报修时记录设备编号、具体区段、故障现象、发生时间、报警提示、物料状态与上下游影响。原始观察和推测应分开，不清楚的字段写“未知”。'},
      {id:'bc-parts',section:'2.2 配件与保修咨询',tags:['配件','保修','规格','合同'],text:'输送带、滚筒等配件的适配需核对真实设备型号、序列号与可安全读取的标识。照片只能辅助确认，不应为了取编号拆卸设备。保修资格与费用由实际供应商核验。'}
    ]}
  );
  const topics=[{id:'all',name:'全部场景'},{id:'alarm',name:'报警查询'},{id:'params',name:'参数资料'},{id:'daily',name:'点检保养'},{id:'fault',name:'异常记录'},{id:'service',name:'报修与服务'}];
  const scenarios=[
    ['mx','alarm','E101 是什么意思？'],['mx','alarm','E202 提示什么？'],['mx','params','主轴转速是多少？'],['mx','daily','开机前要检查什么？'],['mx','daily','每天需要记录什么？'],['mx','fault','异响和振动需要记录什么？'],['mx','fault','加工精度出现偏差，要提供什么信息？'],['mx','service','报修工单需要哪些字段？'],['mx','service','保修和配件咨询需要什么资料？'],
    ['ac','alarm','E101 是什么意思？'],['ac','params','额定排气压力是多少？'],['ac','daily','巡检需要记录什么？'],['ac','daily','滤芯更换周期是多少？'],['ac','fault','供气压力不足，需要记录什么？'],['ac','fault','异响需要记录什么？'],['ac','service','报修需要哪些资料？'],['ac','service','怎么确认保修资格？'],
    ['bc','alarm','E101 是什么意思？'],['bc','params','BC-200 的参数有哪些？'],['bc','daily','日常点检需要记录什么？'],['bc','fault','输送带跑偏该如何记录？'],['bc','fault','滚筒异响要记录什么？'],['bc','service','报修交接需要哪些字段？'],['bc','service','配件适配如何确认？']
  ].map(([device,topic,q])=>({device,topic,q}));
  const norm = s => String(s).toLowerCase().replace(/[\s\-—_]/g,'');
  const aliases = [['多少转','转速'],['几千转','转速'],['开不了机','启动'],['启动之前','开机'],['每天','日常'],['每天','巡检'],['维修单','报修'],['故障单','报修'],['转得多快','转速']];
  function search(question, device, allDocs=docs){
    const q=norm(question);
    if(!q) return {status:'empty',message:'请先输入要查找的问题。',hits:[]};
    if(device==='all') return {status:'clarify',message:'请先选择具体设备。同一报警代码在不同机型上的含义可能不同。',hits:[]};
    const other=devices.find(d=>d.id!==device && q.includes(norm(d.short)));
    if(other) return {status:'clarify',message:'问题提到了 '+other.name+'，与当前设备不一致。请切换设备后再查询。',hits:[]};
    const mentioned=q.match(/(?:mx|mc|ac|bc)\d{2,}/g)||[];
    if(mentioned.some(m=>!devices.some(d=>norm(d.short)===m)))return {status:'clarify',message:'资料库未收录问题中的型号，请核对型号或导入对应资料，不要套用其他机型的信息。',hits:[]};
    let expanded=q;
    for(const [a,b] of aliases) if(q.includes(a)) expanded+=' '+b;
    const modelRemoved=q.replace(/(?:mx|ac|bc|mc)\d+/g,'');
    // Unknown explicit alarm codes must not fall back to generic alarm text.
    const codes=q.match(/e\d{2,}/g)||[];
    const current=allDocs.filter(d=>d.device===device);
    const hits=[];
    for(const doc of current) for(const section of doc.sections){
      const content=norm(section.text), tags=section.tags||[];
      if(codes.length && !codes.every(c=>(content.match(/e\d{2,}/g)||[]).includes(c))) continue;
      let score=0;
      for(const tag of tags) if(expanded.includes(norm(tag))) score+= tag.length>=4?8:5;
      if(codes.length) score+=20;
      if(!doc.sample){
        const cleaned=modelRemoved.replace(/请问|如何|什么|怎么|多少|可以|是否|这个|那个|一下|设备|资料|手册|里面|的|了|吗|呢|是|有|在|我|要|请|能|么|？|\?/g,'');
        const grams=new Set();
        for(let i=0;i<cleaned.length-1;i++) if(/^[\p{L}\p{N}]{2}$/u.test(cleaned.slice(i,i+2))) grams.add(cleaned.slice(i,i+2));
        let matched=0; for(const g of grams) if(content.includes(g)) matched++;
        if(matched>=2 || (grams.size===1 && matched===1)) score+=matched*3+3;
      }
      if(score>=5) hits.push({docId:doc.id,docTitle:doc.title,version:doc.version,sample:doc.sample,matched:tags.filter(t=>expanded.includes(norm(t))),...section,score});
    }
    hits.sort((a,b)=>b.score-a.score);
    if(!hits.length) return {status:'missing',message:'当前设备资料中没有找到足够匹配的内容。请补充型号、报警代码或关键词，也可以导入相关资料后重试。',hits:[]};
    return {status:'found',message:'以下是与问题匹配的资料原文，请核对其是否完整回答了你的问题。',hits:hits.slice(0,3)};
  }
  const cases=[
    {q:'主轴最高转速是多少？',device:'mx',status:'found',target:'mx-params'},
    {q:'E101 是什么意思？',device:'mx',status:'found',target:'mx-e101'},
    {q:'E202 提示什么？',device:'mx',status:'found',target:'mx-e202'},
    {q:'开机前要检查什么？',device:'mx',status:'found',target:'mx-start'},
    {q:'每天需要记录什么？',device:'mx',status:'found',target:'mx-daily'},
    {q:'报修工单需要哪些字段？',device:'mx',status:'found',target:'mx-ticket'},
    {q:'E101 是什么意思？',device:'ac',status:'found',target:'ac-e101'},
    {q:'额定排气压力是多少？',device:'ac',status:'found',target:'ac-params'},
    {q:'E999 如何处理？',device:'mx',status:'missing'},
    {q:'今天北京天气怎么样？',device:'mx',status:'missing'},
    {q:'E101 是什么意思？',device:'all',status:'clarify'},
    {q:'AC-30 的 E101 是什么？',device:'mx',status:'clarify'}
  ];
  cases.push(
    {q:'输送带跑偏该如何记录？',device:'bc',status:'found',target:'bc-deviation'},
    {q:'E101 是什么意思？',device:'bc',status:'found',target:'bc-e101'},
    {q:'日常点检需要记录什么？',device:'bc',status:'found',target:'bc-daily'},
    {q:'滤芯更换周期是多少？',device:'ac',status:'found',target:'ac-filter'},
    {q:'加工精度出现偏差',device:'mx',status:'found',target:'mx-quality'},
    {q:'通讯中断要记录什么？',device:'mx',status:'found',target:'mx-network'},
    {q:'MC-900 的报警是什么？',device:'mx',status:'clarify'},
    {q:'E101 和 E999 如何处理？',device:'mx',status:'missing'},
    {q:'E10 报警是什么？',device:'mx',status:'missing'},
    {q:'BC-200 的 E101',device:'ac',status:'clarify'}
  );
  const api={devices,docs,search,cases,topics,scenarios};
  root.MechEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
