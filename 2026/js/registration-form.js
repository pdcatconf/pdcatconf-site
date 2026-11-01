'use strict';

const adminForm = document.getElementById('registration-form').dataset.admin === 'true';
const API_BASE = adminForm ? location.origin : 'https://101.37.245.203';
const pendingKey = adminForm ? 'pdcat2026-admin-pending-code' : 'pdcat2026-pending-code';
const submittedAt = value => new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Shanghai',hour12:false});
const registrationForm = document.getElementById('registration-form');
const category = document.getElementById('category');
const receipt = document.getElementById('receipt');
const formStatus = document.getElementById('form-status');
const fields = document.getElementById('registration-fields');
const byId = id => document.getElementById(id);
let queryCode = '', saved = null;
try { queryCode=sessionStorage.getItem(pendingKey)||''; } catch (_) { /* The random key prevents duplicates on retry; it is not used for email lookup. */ }

function updateRegistrationCategory() {
  const author = category.value === 'author';
  byId('paper-id').required = author; byId('paper-title').required = author; byId('extra-pages').disabled = !author;if(!author)byId('extra-pages').value='0';updatePaymentAmount();
}
function updatePaymentAmount() {
  const region=byId('country').value,kind=category.value;
  const rmb=['CN','HK','MO','TW'].includes(region);
  byId('currency').value=region?(rmb?'RMB (CNY)':'USD'):'';
  const extra=Number(byId('extra-pages').value||0);
  byId('amount').value=region&&kind&&Number.isInteger(extra)&&extra>=0&&extra<=999999?((kind==='author'?(rmb?3400:510)+extra*(rmb?1000:150):(rmb?1800:270)).toFixed(2)):'';
  for(const option of byId('payment-method').options){if(['domestic_transfer','qr'].includes(option.value))option.disabled=!!region&&!rmb;}
  if(region&&!rmb)byId('payment-method').value='cross_border';
}
byId('country').addEventListener('change',updatePaymentAmount);
byId('extra-pages').addEventListener('input',updatePaymentAmount);
category.addEventListener('change', updateRegistrationCategory);
receipt.addEventListener('change', () => {
  const file = receipt.files[0];byId('receipt-filename').textContent=file?file.name:'No file selected';
  receipt.setCustomValidity(file && (!/\.(jpe?g|png)$/i.test(file.name) || file.size > 10 * 1024 * 1024 || file.size === 0)
    ? 'Choose a nonempty JPG or PNG file no larger than 10 MB.' : '');
});

async function request(path, body, json=false) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000);
  try{
    const response=await fetch(API_BASE+path,{method:'POST',body:json?JSON.stringify(body):body,headers:json?{'Content-Type':'application/json'}:undefined,credentials:adminForm?'same-origin':'omit',cache:'no-store',signal:controller.signal});
    const data=await response.json().catch(()=>({error:'Service unavailable. Please retry.'}));
    if(response.status===401&&adminForm){location.href='/admin/';throw new Error('Please sign in again.');}
    if(!response.ok){const error=new Error(data.error||'Request failed');error.registrationId=data.id;throw error;}
    return data;
  }catch(error){
    if(error instanceof TypeError || error.name==='AbortError')throw new Error('Connection interrupted. The submission may have reached the server; retry without changing the form.');
    throw error;
  }finally{clearTimeout(timeout);}
}

registrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if(saved)return;
  if(!queryCode){const bytes=crypto.getRandomValues(new Uint8Array(32));queryCode=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
  try{sessionStorage.setItem(pendingKey,queryCode);}catch(_){}
  const body=new FormData(registrationForm);body.set('query_code',queryCode);
  fields.disabled=true;formStatus.textContent='Submitting…';
  try{
    saved=await request(adminForm?'/api/admin/registrations':'/api/registrations',body);
    byId('saved-id').textContent=saved.id;saved.email=body.get('email');
    byId('saved-paper-id').textContent=saved.paper_id||'Not applicable';byId('saved-created-at').textContent=submittedAt(saved.created_at);
    byId('submission-result').hidden=false;
    formStatus.textContent=saved.message;
    try{sessionStorage.removeItem(pendingKey);}catch(_){}
    byId('submission-result').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){formStatus.textContent=error.message;fields.disabled=false;updateRegistrationCategory();}
});

byId('save-confirmation').addEventListener('click',()=>{
  const content=`PDCAT 2026 registration confirmation\nRegistration ID: ${saved.id}\nRegistration email: ${saved.email}\nPaper ID: ${saved.paper_id||'Not applicable'}\nSubmitted at (UTC+8): ${submittedAt(saved.created_at)}\nPayment query: ${adminForm?'https://www.pd-cat.org/2026/registration-query.html':new URL('registration-query.html', location.href).href}\nReceived; payment awaits review.\n`;
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=saved.id+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
byId('new-registration').addEventListener('click',()=>{
  saved=null;queryCode='';registrationForm.reset();byId('receipt-filename').textContent='No file selected';fields.disabled=false;receipt.setCustomValidity('');updateRegistrationCategory();formStatus.textContent='';byId('submission-result').hidden=true;
  try{sessionStorage.removeItem(pendingKey);}catch(_){}
});
if(adminForm){
  fetch('/api/admin/session',{credentials:'same-origin',cache:'no-store'}).then(response=>{
    if(response.status===401){location.href='/admin/';return;}
    if(!response.ok)throw new Error('Unable to verify your session. Reload to retry.');
    fields.disabled=false;updateRegistrationCategory();
  }).catch(error=>{formStatus.textContent=error.message;});
}else{fields.disabled=false;updateRegistrationCategory();}
