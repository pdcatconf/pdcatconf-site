'use strict';
const queryForm=document.getElementById('query-form');
const queryButton=document.getElementById('query-button');
const queryStatus=document.getElementById('query-status');
const queryResult=document.getElementById('query-result');
const paymentLabels={pending:'Pending review / 待审核',confirmed:'Confirmed / 已确认',needs_info:'More information needed / 需补充材料'};
queryButton.disabled=false;
queryForm.addEventListener('submit',async event=>{
 event.preventDefault();queryButton.disabled=true;queryResult.replaceChildren();queryStatus.textContent='Loading… / 正在查询…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try {
  const response=await fetch('https://101.37.245.203/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('query-email').value.trim()}),credentials:'omit',cache:'no-store',signal:controller.signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Query failed / 查询失败');
  for(const [index,item] of data.items.entries()){
   const section=document.createElement('section');section.className='form-section';const title=document.createElement('h3');title.textContent=`Registration ${index+1} / 登记 ${index+1}`;section.append(title);
   const currency=item.currency==='USD'?'USD':'RMB';
   const money=value=>value===null?'Not confirmed / 尚未确认':currency+' '+(value/100).toFixed(2);
   for(const [label,value] of [['Paper ID',item.paper_id||'Not applicable'],['Submitted at (UTC+8)',item.created_at?new Date(item.created_at).toLocaleString('en-GB',{timeZone:'Asia/Shanghai',hour12:false}):'—'],['Status / 缴费状态',paymentLabels[item.status]],['Amount due / 应缴金额',money(item.expected_cents)],['Registration amount / 登记金额',money(item.paid_cents)],['Confirmed paid / 已确认缴费',money(item.confirmed_cents)]]){
    const row=document.createElement('div');row.className='result-row';const key=document.createElement('strong'),val=document.createElement('span');key.textContent=label;val.textContent=value;row.append(key,val);section.append(row);
   }
   queryResult.append(section);
  }
  queryStatus.textContent=data.items.length?'Payment records found / 已查到缴费登记':'No registration found for this email / 未查到该邮箱的登记信息';
 }catch(error){queryStatus.textContent=error instanceof TypeError||error.name==='AbortError'?'Connection failed. Please retry. / 连接失败，请重试。':error.message;}
 finally{clearTimeout(timeout);queryButton.disabled=false;}
});
