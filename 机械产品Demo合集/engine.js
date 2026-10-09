(function (root) {
  'use strict';
  const devices = [{id:'mx',name:'MX-200 数控加工中心',short:'MX-200'}, {id:'ac',name:'AC-30 空压机',short:'AC-30'}];
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
  const norm = s => String(s).toLowerCase().replace(/[\s\-—_]/g,'');
  const aliases = [['多少转','转速'],['几千转','转速'],['开不了机','启动'],['启动之前','开机'],['每天','日常'],['每天','巡检'],['维修单','报修'],['故障单','报修'],['转得多快','转速']];
  function search(question, device, allDocs=docs){
    const q=norm(question);
    if(!q) return {status:'empty',message:'请先输入要查找的问题。',hits:[]};
    if(device==='all') return {status:'clarify',message:'请先选择具体设备。同一报警代码在不同机型上的含义可能不同。',hits:[]};
    const other=devices.find(d=>d.id!==device && q.includes(norm(d.short)));
    if(other) return {status:'clarify',message:'问题提到了 '+other.name+'，与当前设备不一致。请切换设备后再查询。',hits:[]};
    let expanded=q;
    for(const [a,b] of aliases) if(q.includes(a)) expanded+=' '+b;
    const modelRemoved=q.replace(/mx200|ac30/g,'');
    // Unknown explicit alarm codes must not fall back to generic alarm text.
    const codes=q.match(/e\d{3,}/g)||[];
    const current=allDocs.filter(d=>d.device===device);
    const hits=[];
    for(const doc of current) for(const section of doc.sections){
      const content=norm(section.text), tags=section.tags||[];
      if(codes.length && !codes.every(c=>content.includes(c))) continue;
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
      if(score>=5) hits.push({docId:doc.id,docTitle:doc.title,sample:doc.sample,...section,score});
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
  const api={devices,docs,search,cases};
  root.MechEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
