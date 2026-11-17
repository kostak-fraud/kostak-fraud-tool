const state={section:'transactions',channel:'POS',page:0,status:'',score:'',search:'',user:'analyst.one',selected:new Set(),pageData:null,detail:null,rules:[],running:false,columnFilters:[],editingFilterId:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const labels={WALLET:'Wallet',POS:'Virtual POS',PHYSICAL_POS:'Physical POS',WAITING_FOR_REVIEW:'Waiting for Review',IN_REVIEW:'In Review',ON_HOLD:'On Hold',FRAUD:'Marked as Fraud',NOT_FRAUD:'Marked as Not Fraud'};
const filterColumns={
  id:{label:'Transaction ID',type:'string'},occurredAt:{label:'Timestamp',type:'date'},customerRef:{label:'Customer',type:'string'},
  instrument:{label:'Instrument',type:'string'},counterparty:{label:'Merchant / Receiver',type:'string'},transactionType:{label:'Transaction Type',type:'string'},
  amount:{label:'Amount',type:'number'},currency:{label:'Currency',type:'enum',options:['TRY','USD','EUR','GBP']},
  merchantRisk:{label:'Merchant Risk',type:'enum',options:['LOW','MEDIUM','HIGH']},threeDs:{label:'3D Secure',type:'boolean',options:[['true','Yes'],['false','No']]},
  riskScore:{label:'Risk Score',type:'number'},reviewStatus:{label:'Review Status',type:'enum',options:Object.keys(labels).filter(k=>k.includes('REVIEW')||['IN_REVIEW','ON_HOLD','FRAUD','NOT_FRAUD'].includes(k)).map(k=>[k,labels[k]])},
  assignedAnalyst:{label:'Assigned Analyst',type:'string'},paymentBlocked:{label:'Payment Blocked',type:'boolean',options:[['true','Blocked'],['false','Passed']]},
  createdAt:{label:'Created at',type:'date'},transactionDate:{label:'Transaction date',type:'date'},
  receiverAccountNumber:{label:'Receiver account number',type:'string'},senderAccountNumber:{label:'Sender account number',type:'string'},
  senderIban:{label:'Sender IBAN',type:'string'},receiverIban:{label:'Receiver IBAN',type:'string'},
  senderAccountHolderName:{label:'Sender account holder name',type:'string'},receiverAccountHolderName:{label:'Receiver account holder name',type:'string'},
  senderAccountCreatedDate:{label:'Sender account created date',type:'date'},receiverAccountCreatedDate:{label:'Receiver account created date',type:'date'},
  receiverKycLevel:{label:'Receiver KYC level',type:'number'},senderKycLevel:{label:'Sender KYC level',type:'number'},
  senderAccountEmail:{label:'Sender account email',type:'string'},receiverAccountEmail:{label:'Receiver account email',type:'string'},
  senderAge:{label:'Sender age',type:'number'},receiverAge:{label:'Receiver age',type:'number'},
  ruleSummary:{label:'Rule',type:'string'},description:{label:'Description',type:'string'},
  ccHolderName:{label:'CC holder name',type:'string'},ccNo:{label:'CC no',type:'string'},merchantName:{label:'Merchant name',type:'string'},
  resolution:{label:'Resolution',type:'enum',options:[['ESCALATED','Escalated'],['APPROVED','Approved'],['DECLINED','Declined']]},
  billAddress:{label:'Bill address',type:'string'},billCity:{label:'Bill city',type:'string'},billState:{label:'Bill state',type:'string'},
  billPostcode:{label:'Bill postcode',type:'string'},billCountry:{label:'Bill country',type:'string'},billEmail:{label:'Bill email',type:'string'},billPhone:{label:'Bill phone',type:'string'},
  cardProgram:{label:'Card program',type:'enum',options:['Bankkart Combo','World','Axess','Bonus','Maximum','CardFinans','Paraf']},
  isRecurringPayment:{label:'Is recurring payment',type:'boolean',options:[['true','Yes'],['false','No']]},
  paymentFrequency:{label:'Payment frequency',type:'enum',options:[['N/A','N/A'],['WEEKLY','Weekly'],['MONTHLY','Monthly'],['QUARTERLY','Quarterly'],['YEARLY','Yearly']]},
  bin:{label:'BIN',type:'string'},responseCode:{label:'Response code',type:'string'},merchantId:{label:'Merchant ID',type:'string'},
  cardCountry:{label:'Card country',type:'string'},merchantMcc:{label:'Merchant MCC',type:'string'},
  nonSecureStatus:{label:'Non-secure status',type:'enum',options:[['3D_SECURE','3D Secure'],['2D_NON_SECURE','2D Non-secure']]},
  bankErrorCode:{label:'Bank error code',type:'string'},bankErrorDescription:{label:'Bank error description',type:'string'},
  cardExpireDate:{label:'Card expire date',type:'date'},merchantCreateDate:{label:'Merchant create date',type:'date'},
  merchantRiskLevel:{label:'Merchant risk level',type:'enum',options:['LOW','MID','HIGH']},merchantRiskScore:{label:'Merchant risk score',type:'number'},
  cardToken:{label:'Card token',type:'string'},merchantWebsite:{label:'Merchant website',type:'string'},callbackUrl3d:{label:'Callback URL 3D',type:'string'},
  merchantWebsiteDomainRegistryMonthDuration:{label:'Merchant website domain registry month duration',type:'number'},
  merchantIp:{label:'Merchant IP',type:'string'},merchantIpCountry:{label:'Merchant IP country',type:'string'},
  invoiceId:{label:'Invoice ID',type:'string'},invoiceDescription:{label:'Invoice description',type:'string'},
  merchantCreatedDate:{label:'Merchant created date',type:'date'},terminalUid:{label:'Terminal UID',type:'string'},
  terminalSerialNo:{label:'Terminal serial no',type:'string'},imei:{label:'IMEI',type:'string'},locationTime:{label:'Location time',type:'date'},
  lastPingTime:{label:'Last ping time',type:'date'},timeOnTerminal:{label:'Time on terminal',type:'number'},batteryLevel:{label:'Battery level',type:'number'},
  networkType:{label:'Network type',type:'enum',options:['WIFI','ETHERNET','4G','5G']},terminalIpAddress:{label:'Terminal IP address',type:'string'}
};
const channelColumnKeys={
  WALLET:['id','createdAt','transactionDate','receiverAccountNumber','senderAccountNumber','senderIban','receiverIban','amount','currency','senderAccountHolderName','receiverAccountHolderName','senderAccountCreatedDate','receiverAccountCreatedDate','receiverKycLevel','senderKycLevel','senderAccountEmail','receiverAccountEmail','senderAge','receiverAge','ruleSummary','riskScore','assignedAnalyst','reviewStatus','description'],
  POS:['id','createdAt','transactionDate','ccHolderName','ccNo','merchantName','amount','riskScore','ruleSummary','resolution','reviewStatus','assignedAnalyst','billAddress','billCity','billState','billPostcode','billCountry','billEmail','billPhone','cardProgram','isRecurringPayment','paymentFrequency','bin','responseCode','merchantId','cardCountry','merchantMcc','nonSecureStatus','bankErrorCode','bankErrorDescription','cardExpireDate','merchantCreateDate','merchantRiskLevel','merchantRiskScore','cardToken','merchantWebsite','callbackUrl3d','merchantWebsiteDomainRegistryMonthDuration','merchantIp','merchantIpCountry','invoiceId','invoiceDescription','currency'],
  PHYSICAL_POS:['id','createdAt','transactionDate','ccNo','amount','currency','merchantName','bankErrorCode','bankErrorDescription','assignedAnalyst','reviewStatus','riskScore','ruleSummary','resolution','invoiceId','invoiceDescription','cardProgram','bin','merchantId','cardCountry','merchantMcc','merchantCreatedDate','terminalUid','terminalSerialNo','imei','locationTime','lastPingTime','timeOnTerminal','batteryLevel','networkType','terminalIpAddress']
};
const operatorSets={
  string:[['EQ','Equal'],['NE','Not equal'],['CONTAINS','Contains'],['STARTS_WITH','Starts with'],['ENDS_WITH','Ends with'],['REGEX','Regex match']],
  number:[['EQ','Equal'],['NE','Not equal'],['GT','Greater than'],['GTE','Greater or equal'],['LT','Less than'],['LTE','Less or equal']],
  date:[['EQ','Equal'],['NE','Not equal'],['GT','After'],['GTE','After or equal'],['LT','Before'],['LTE','Before or equal']],
  enum:[['EQ','Equal'],['NE','Not equal']],boolean:[['EQ','Equal'],['NE','Not equal']]
};
const statusClass=s=>`badge status-${s.toLowerCase().replaceAll('_','-')}`;
const fmtDate=v=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(v));
const money=(v,c)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:c}).format(v);
async function request(path,options={}){const r=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json','X-Demo-User':state.user,...options.headers}});const data=await r.json();if(!r.ok)throw new Error(data.message||`API ${r.status}`);return data}
function toast(message){const el=$('#toast');el.innerHTML=`<span>✓</span>${message}`;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),2600)}
async function loadTransactions(){const q=new URLSearchParams({channel:state.channel,page:state.page,size:20});if(state.status)q.set('status',state.status);if(state.score)q.set('minScore',state.score);if(state.search)q.set('search',state.search);const filters=state.columnFilters.map(({field,operator,value})=>({field,operator,value}));if(filters.length)q.set('filters',JSON.stringify(filters));try{state.pageData=await request('/transactions?'+q);state.selected.clear();renderTransactions()}catch(e){toast(e.message)}}
function legacyRenderTransactions(){const d=state.pageData, rows=d.content;$('#nav-count').textContent=d.totalElements;$('#volume').textContent=d.totalElements;$('#volume-note').textContent=`${labels[state.channel]} records`;$('#high-risk').textContent=rows.filter(t=>t.riskScore>=60).length;$('#awaiting').textContent=rows.filter(t=>t.reviewStatus==='WAITING_FOR_REVIEW').length;$('#selection-label').textContent='Current page';$('#select-all').checked=false;$('#tx-body').innerHTML=rows.map(t=>`<tr class="${t.riskScore>=60?'high-risk-row':''}" data-id="${t.id}"><td class="check"><input class="row-check" data-id="${t.id}" type="checkbox"></td><td><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td><td>${fmtDate(t.occurredAt)}</td><td><strong>${t.customerRef}</strong><small>${t.cardRef||t.senderRef||'—'}</small></td><td><strong>${t.merchantRef||t.receiverRef||'Internal'}</strong><small>${t.transactionType.replaceAll('_',' ')}${t.merchantRisk?' · '+t.merchantRisk:''}</small></td><td class="right amount">${money(t.amount,t.currency)}</td><td>${risk(t.riskScore)}</td><td><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span>${t.paymentBlocked?'<small class="blocked">PAYMENT BLOCKED</small>':''}</td><td>${t.assignedAnalyst||'<span class="muted">Unassigned</span>'}</td><td><button class="icon-btn">→</button></td></tr>`).join('');$('#empty').classList.toggle('hidden',rows.length>0);$('#page-summary').textContent=`Showing ${rows.length} of ${d.totalElements} records`;$('#page-number').textContent=`Page ${d.number+1} / ${Math.max(1,d.totalPages)}`;$('#prev').disabled=d.first;$('#next').disabled=d.last;$$('#tx-body tr').forEach(row=>row.addEventListener('click',e=>{if(!e.target.classList.contains('row-check'))openDetail(row.dataset.id)}));$$('.row-check').forEach(c=>c.addEventListener('change',e=>{e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);$('#selection-label').textContent=state.selected.size?`${state.selected.size} selected`:'Current page'}))}
function risk(score){const level=score>=80?'critical':score>=60?'high':score>=30?'medium':'low';return `<div class="risk risk-${level}"><strong>${score}</strong><div><i style="width:${score}%"></i></div></div>`}
async function loadRules(){state.rules=await request('/rules');$('#rule-count').textContent=state.rules.filter(r=>r.active).length;$('#rule-grid').innerHTML=state.rules.map(r=>`<article class="rule-card"><div class="rule-top"><span class="rule-state ${r.active?'on':'off'}">${r.active?'ACTIVE':'INACTIVE'}</span><span class="channel-chip">${labels[r.channel]}</span></div><h3>${esc(r.name)}</h3><p>${esc(r.description||'No description')}</p><div class="condition"><span>IF</span><code>${r.fieldName} ${r.operator} ${esc(r.expectedValue)}</code></div><div class="rule-score"><span>Risk contribution</span><strong>+${r.scoreContribution}</strong></div><footer><small>v${r.version} · ${fmtDate(r.updatedAt)}</small><button class="switch" data-on="${r.active}" data-rule="${r.id}"><i></i></button></footer></article>`).join('');$$('[data-rule]').forEach(b=>b.onclick=async()=>{await request(`/rules/${b.dataset.rule}/toggle`,{method:'POST'});toast('Rule status updated');loadRules()})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const valueOrNA=value=>value===null||value===undefined||value===''?'N/A':value;
const dateOrNA=value=>value?fmtDate(value):'N/A';
function ruleSummary(tx){const count=tx.ruleHits?.length||0;return `Detected by ${count} rule${count===1?'':'s'}`}
function renderRuleSummary(tx){
  const hits=tx.ruleHits||[],content=hits.length?hits.map(hit=>`<span>${esc(hit.ruleName)} <b>+${hit.scoreContribution}</b></span>`).join(''):'<span>No rule matched</span>';
  return `<span class="rule-summary">${ruleSummary(tx)}<span class="rule-tooltip"><strong>Matched rules</strong>${content}</span></span>`;
}
function legacyRenderWalletCell(t,key){
  const attr=`data-column-key="${key}"`;
  if(key==='id')return `<td ${attr}><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td>`;
  if(['createdAt','transactionDate','senderAccountCreatedDate','receiverAccountCreatedDate'].includes(key))return `<td ${attr}>${dateOrNA(t[key])}</td>`;
  if(key==='amount')return `<td ${attr} class="right amount">${money(t.amount,t.currency)}</td>`;
  if(key==='currency')return `<td ${attr} class="mono">${esc(t.currency)}</td>`;
  if(key==='riskScore')return `<td ${attr}>${risk(t.riskScore)}</td>`;
  if(key==='assignedAnalyst')return `<td ${attr}>${t.assignedAnalyst?`<span class="assigned-user">${esc(t.assignedAnalyst)}</span>`:'<span class="muted">Unassigned</span>'}</td>`;
  if(key==='reviewStatus')return `<td ${attr}><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span></td>`;
  if(key==='ruleSummary')return `<td ${attr}>${renderRuleSummary(t)}</td>`;
  if(['receiverKycLevel','senderKycLevel'].includes(key))return `<td ${attr}>${t[key]==null?'N/A':`<strong>${t[key]}</strong><small>/ 100</small>`}</td>`;
  if(['senderAge','receiverAge'].includes(key))return `<td ${attr}>${t[key]==null?'N/A':`${t[key]} years`}</td>`;
  if(['senderIban','receiverIban','senderAccountNumber','receiverAccountNumber'].includes(key))return `<td ${attr} class="mono">${esc(valueOrNA(t[key]))}</td>`;
  return `<td ${attr}>${esc(valueOrNA(t[key]))}</td>`;
}
function renderVirtualPosCell(t,key){
  const attr=`data-column-key="${key}"`;
  if(key==='id')return `<td ${attr}><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td>`;
  if(['createdAt','transactionDate','cardExpireDate','merchantCreateDate'].includes(key))return `<td ${attr}>${dateOrNA(t[key])}</td>`;
  if(key==='amount')return `<td ${attr} class="right amount">${money(t.amount,t.currency)}</td>`;
  if(key==='riskScore')return `<td ${attr}>${risk(t.riskScore)}</td>`;
  if(key==='ruleSummary')return `<td ${attr}>${renderRuleSummary(t)}</td>`;
  if(key==='resolution')return `<td ${attr}><span class="resolution resolution-${String(t.resolution).toLowerCase()}">${esc(t.resolution)}</span></td>`;
  if(key==='reviewStatus')return `<td ${attr}><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span></td>`;
  if(key==='assignedAnalyst')return `<td ${attr}>${t.assignedAnalyst?`<span class="assigned-user">${esc(t.assignedAnalyst)}</span>`:'<span class="muted">Unassigned</span>'}</td>`;
  if(key==='isRecurringPayment')return `<td ${attr}><span class="boolean-cell ${t.isRecurringPayment?'yes':'no'}">${t.isRecurringPayment?'YES':'NO'}</span></td>`;
  if(key==='merchantRiskScore')return `<td ${attr}>${t[key]==null?'N/A':`<strong>${t[key]}</strong><small>/ 100</small>`}</td>`;
  if(key==='merchantRiskLevel')return `<td ${attr}><span class="merchant-risk risk-level-${String(t[key]).toLowerCase()}">${esc(valueOrNA(t[key]))}</span></td>`;
  if(['ccNo','bin','responseCode','merchantId','merchantMcc','bankErrorCode','cardToken','merchantIp','invoiceId','currency'].includes(key))return `<td ${attr} class="mono">${esc(valueOrNA(t[key]))}</td>`;
  return `<td ${attr}>${esc(valueOrNA(t[key]))}</td>`;
}
function renderPhysicalPosCell(t,key){
  const attr=`data-column-key="${key}"`;
  if(key==='id')return `<td ${attr}><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td>`;
  if(['createdAt','transactionDate','merchantCreatedDate','locationTime','lastPingTime'].includes(key))return `<td ${attr}>${dateOrNA(t[key])}</td>`;
  if(key==='amount')return `<td ${attr} class="right amount">${money(t.amount,t.currency)}</td>`;
  if(key==='riskScore')return `<td ${attr}>${risk(t.riskScore)}</td>`;
  if(key==='ruleSummary')return `<td ${attr}>${renderRuleSummary(t)}</td>`;
  if(key==='resolution')return `<td ${attr}><span class="resolution resolution-${String(t.resolution).toLowerCase()}">${esc(t.resolution)}</span></td>`;
  if(key==='reviewStatus')return `<td ${attr}><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span></td>`;
  if(key==='assignedAnalyst')return `<td ${attr}>${t.assignedAnalyst?`<span class="assigned-user">${esc(t.assignedAnalyst)}</span>`:'<span class="muted">Unassigned</span>'}</td>`;
  if(key==='batteryLevel')return `<td ${attr}><strong>${valueOrNA(t[key])}</strong>${t[key]==null?'':'%'}</td>`;
  if(key==='timeOnTerminal')return `<td ${attr}>${t[key]==null?'N/A':`${t[key]} min`}</td>`;
  if(['ccNo','currency','bankErrorCode','invoiceId','bin','merchantId','merchantMcc','terminalUid','terminalSerialNo','imei','networkType','terminalIpAddress'].includes(key))return `<td ${attr} class="mono">${esc(valueOrNA(t[key]))}</td>`;
  return `<td ${attr}>${esc(valueOrNA(t[key]))}</td>`;
}
function renderTransactions(){
  const d=state.pageData,rows=d.content;
  $('#nav-count').textContent=d.totalElements;$('#volume').textContent=d.totalElements;$('#volume-note').textContent=`${labels[state.channel]} records`;
  $('#high-risk').textContent=rows.filter(t=>t.riskScore>=60).length;$('#awaiting').textContent=rows.filter(t=>t.reviewStatus==='WAITING_FOR_REVIEW').length;
  $('#selection-label').textContent='Current page';$('#select-all').checked=false;
  if(state.channel==='WALLET'){
    $('#tx-body').innerHTML=rows.map(t=>`<tr class="${t.riskScore>=60?'high-risk-row':''}" data-id="${t.id}"><td class="check"><input class="row-check" data-id="${t.id}" type="checkbox"></td>${channelColumnKeys.WALLET.map(key=>renderWalletCell(t,key)).join('')}<td><button class="icon-btn">&#8594;</button></td></tr>`).join('');
  }else if(state.channel==='POS'){
    $('#tx-body').innerHTML=rows.map(t=>`<tr class="${t.riskScore>=60?'high-risk-row':''}" data-id="${t.id}"><td class="check"><input class="row-check" data-id="${t.id}" type="checkbox"></td>${channelColumnKeys.POS.map(key=>renderVirtualPosCell(t,key)).join('')}<td><button class="icon-btn">&#8594;</button></td></tr>`).join('');
  }else if(state.channel==='PHYSICAL_POS'){
    $('#tx-body').innerHTML=rows.map(t=>`<tr class="${t.riskScore>=60?'high-risk-row':''}" data-id="${t.id}"><td class="check"><input class="row-check" data-id="${t.id}" type="checkbox"></td>${channelColumnKeys.PHYSICAL_POS.map(key=>renderPhysicalPosCell(t,key)).join('')}<td><button class="icon-btn">&#8594;</button></td></tr>`).join('');
  }else $('#tx-body').innerHTML=rows.map(t=>`<tr class="${t.riskScore>=60?'high-risk-row':''}" data-id="${t.id}">
    <td class="check"><input class="row-check" data-id="${t.id}" type="checkbox"></td>
    <td><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td>
    <td>${fmtDate(t.occurredAt)}</td><td><strong>${t.customerRef}</strong></td><td><strong>${t.cardRef||t.senderRef||'—'}</strong></td>
    <td><strong>${t.merchantRef||t.receiverRef||'Internal'}</strong></td><td><strong>${t.transactionType.replaceAll('_',' ')}</strong></td>
    <td class="right amount">${money(t.amount,t.currency)}</td><td class="mono">${t.currency}</td><td>${t.merchantRisk||'—'}</td>
    <td><span class="boolean-cell ${t.threeDs?'yes':'no'}">${t.threeDs?'YES':'NO'}</span></td><td>${risk(t.riskScore)}</td>
    <td><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span></td><td>${t.assignedAnalyst||'<span class="muted">Unassigned</span>'}</td>
    <td><span class="${t.paymentBlocked?'payment-blocked':'payment-passed'}">${t.paymentBlocked?'BLOCKED':'PASSED'}</span></td><td><button class="icon-btn">→</button></td>
  </tr>`).join('');
  $('#empty').classList.toggle('hidden',rows.length>0);$('#page-summary').textContent=`Showing ${rows.length} of ${d.totalElements} records`;
  $('#page-number').textContent=`Page ${d.number+1} / ${Math.max(1,d.totalPages)}`;$('#prev').disabled=d.first;$('#next').disabled=d.last;
  $$('#tx-body tr').forEach(row=>row.addEventListener('click',e=>{if(!e.target.classList.contains('row-check'))openDetail(row.dataset.id)}));
  $$('.row-check').forEach(c=>c.addEventListener('change',e=>{e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);$('#selection-label').textContent=state.selected.size?`${state.selected.size} selected`:'Current page'}));
  renderActiveFilters();
}

function filterDisplayValue(filter){
  const config=filterColumns[filter.field];
  if(config.type==='boolean')return filter.value==='true'?'Yes':'No';
  if(filter.field==='reviewStatus')return labels[filter.value]||filter.value;
  if(config.type==='date'&&filter.value.toLocaleLowerCase('tr-TR')!=='n/a')return fmtDate(filter.value);
  return filter.value;
}
function legacyRenderActiveFilters(){
  const filters=Object.values(state.columnFilters),bar=$('#active-filter-bar');bar.classList.toggle('hidden',filters.length===0);
  $('#filter-chips').innerHTML=filters.map(f=>`<span class="filter-chip"><strong>${filterColumns[f.field].label}</strong><code>${f.operator} · ${esc(filterDisplayValue(f))}</code><button data-remove-column="${f.field}" title="Remove">×</button></span>`).join('');
  $$('[data-remove-column]').forEach(button=>button.onclick=()=>{delete state.columnFilters[button.dataset.removeColumn];state.page=0;loadTransactions()});
  $$('.column-filter').forEach(button=>button.classList.toggle('active',Boolean(state.columnFilters[button.dataset.filterField])));
}
function optionMarkup(options){return options.map(option=>{const pair=Array.isArray(option)?option:[option,option];return `<option value="${esc(pair[0])}">${esc(pair[1])}</option>`}).join('')}
function openColumnFilter(field){
  const config=filterColumns[field],existing=state.columnFilters[field];state.editingFilter=field;
  $('#filter-title').textContent=`Filter: ${config.label}`;
  $('#filter-operator').innerHTML=operatorSets[config.type].map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
  $('#filter-operator').value=existing?.operator||operatorSets[config.type][0][0];
  const current=existing?.value||'';
  if(config.type==='enum'||config.type==='boolean')$('#filter-value-host').innerHTML=`<select id="filter-value">${optionMarkup(config.options)}</select>`;
  else if(config.type==='date')$('#filter-value-host').innerHTML=`<input id="filter-value" type="datetime-local" value="${current?new Date(current).toISOString().slice(0,16):''}">`;
  else if(config.type==='number')$('#filter-value-host').innerHTML=`<input id="filter-value" type="number" step="any" value="${esc(current)}" placeholder="Enter numeric value">`;
  else $('#filter-value-host').innerHTML=`<input id="filter-value" type="text" maxlength="200" value="${esc(current)}" placeholder="Enter filter value">`;
  if(existing&&$('#filter-value'))$('#filter-value').value=config.type==='date'?new Date(existing.value).toISOString().slice(0,16):existing.value;
  $('#remove-filter').classList.toggle('hidden',!existing);
  $('#filter-help').textContent=config.type==='string'?'Text filters are case-insensitive. Regex patterns are limited to 120 characters.':config.type==='date'?'The selected date and time is compared exactly in your local timezone.':'Multiple column filters are combined with AND.';
  $('#filter-overlay').classList.remove('hidden');
}
function legacyRenderWalletDetailInfo(t){
  const info=[
    ['Transaction ID',t.id],['Created at',dateOrNA(t.createdAt)],['Transaction date',dateOrNA(t.transactionDate)],
    ['Receiver account number',valueOrNA(t.receiverAccountNumber)],['Sender account number',valueOrNA(t.senderAccountNumber)],
    ['Sender IBAN',t.senderIban],['Receiver IBAN',t.receiverIban],['Amount',money(t.amount,t.currency)],['Currency',t.currency],
    ['Sender account holder name',t.senderAccountHolderName],['Receiver account holder name',t.receiverAccountHolderName],
    ['Sender account created date',dateOrNA(t.senderAccountCreatedDate)],['Receiver account created date',dateOrNA(t.receiverAccountCreatedDate)],
    ['Receiver KYC level',t.receiverKycLevel==null?'N/A':`${t.receiverKycLevel} / 100`],['Sender KYC level',t.senderKycLevel==null?'N/A':`${t.senderKycLevel} / 100`],
    ['Sender account email',valueOrNA(t.senderAccountEmail)],['Receiver account email',valueOrNA(t.receiverAccountEmail)],
    ['Sender age',valueOrNA(t.senderAge)],['Receiver age',valueOrNA(t.receiverAge)],['Rule',ruleSummary(t)],
    ['Score',`${t.riskScore} / 100`],['Assigned',t.assignedAnalyst||'Unassigned'],['Status',labels[t.reviewStatus]],['Description',t.description]
  ];
  $('#detail-info').innerHTML=info.map(([key,value])=>`<div><span>${key}</span><strong class="detail-value">${esc(value)}</strong></div>`).join('');
}
function virtualPosDetailValue(t,key){
  if(['createdAt','transactionDate','cardExpireDate','merchantCreateDate'].includes(key))return dateOrNA(t[key]);
  if(key==='amount')return money(t.amount,t.currency);
  if(key==='riskScore'||key==='merchantRiskScore')return t[key]==null?'N/A':`${t[key]} / 100`;
  if(key==='ruleSummary')return ruleSummary(t);
  if(key==='reviewStatus')return labels[t[key]];
  if(key==='assignedAnalyst')return t[key]||'Unassigned';
  if(key==='isRecurringPayment')return t[key]?'Yes':'No';
  return valueOrNA(t[key]);
}
function renderVirtualPosDetailInfo(t){
  const labelOverrides={riskScore:'Score',reviewStatus:'Status',assignedAnalyst:'Assignee'};
  const info=channelColumnKeys.POS.map(key=>[labelOverrides[key]||filterColumns[key].label,virtualPosDetailValue(t,key)]);
  $('#detail-info').innerHTML=info.map(([key,value])=>`<div><span>${key}</span><strong class="detail-value">${esc(value)}</strong></div>`).join('');
}
function physicalPosDetailValue(t,key){
  if(['createdAt','transactionDate','merchantCreatedDate','locationTime','lastPingTime'].includes(key))return dateOrNA(t[key]);
  if(key==='amount')return money(t.amount,t.currency);
  if(key==='riskScore')return `${t.riskScore} / 100`;
  if(key==='ruleSummary')return ruleSummary(t);
  if(key==='reviewStatus')return labels[t[key]];
  if(key==='assignedAnalyst')return t[key]||'Unassigned';
  if(key==='batteryLevel')return t[key]==null?'N/A':`${t[key]}%`;
  if(key==='timeOnTerminal')return t[key]==null?'N/A':`${t[key]} min`;
  return valueOrNA(t[key]);
}
function renderPhysicalPosDetailInfo(t){
  const labelOverrides={riskScore:'Score',reviewStatus:'Status',assignedAnalyst:'Assignee'};
  const info=channelColumnKeys.PHYSICAL_POS.map(key=>[labelOverrides[key]||filterColumns[key].label,physicalPosDetailValue(t,key)]);
  $('#detail-info').innerHTML=info.map(([key,value])=>`<div><span>${key}</span><strong class="detail-value">${esc(value)}</strong></div>`).join('');
}
async function openDetail(id){state.detail=await request(`/transactions/${id}`);renderDetail();if(state.detail.transaction.channel==='WALLET')renderWalletDetailInfo(state.detail.transaction);else if(state.detail.transaction.channel==='POS')renderVirtualPosDetailInfo(state.detail.transaction);else if(state.detail.transaction.channel==='PHYSICAL_POS')renderPhysicalPosDetailInfo(state.detail.transaction);$('#detail-overlay').classList.remove('hidden');loadTransactions()}
function renderDetail(){const d=state.detail,t=d.transaction;$('#detail-id').textContent=t.id.slice(0,8).toUpperCase();$('#detail-risk').innerHTML=`${t.riskScore}<small>/100</small>`;$('#detail-status').className=statusClass(t.reviewStatus);$('#detail-status').textContent=labels[t.reviewStatus];$('#detail-analyst').textContent=t.assignedAnalyst||'Unassigned';$('#lock-warning').classList.toggle('hidden',d.editable);const info=[['Transaction',t.id],['Channel',labels[t.channel]],['Occurred',fmtDate(t.occurredAt)],['Type',t.transactionType],['Customer',t.customerRef],['Card / sender',t.cardRef||t.senderRef||'—'],['Merchant / receiver',t.merchantRef||t.receiverRef||'—'],['3D Secure',t.threeDs?'Yes':'No'],['Amount',money(t.amount,t.currency)],['Payment',t.paymentBlocked?'BLOCKED':'PASSED']];$('#detail-info').innerHTML=info.map(([k,v])=>`<div><span>${k}</span><strong class="detail-value">${esc(v)}</strong></div>`).join('');$('#hit-count').textContent=d.ruleHits.length;$('#hit-list').innerHTML=d.ruleHits.length?d.ruleHits.map(h=>`<div><span class="rule-icon">⌁</span><div><strong>${esc(h.ruleName)}</strong><small>Matched ${fmtDate(h.matchedAt)}</small></div><b>+${h.scoreContribution}</b></div>`).join(''):'<div class="empty small">No rule matched this transaction.</div>';$('#comment-count').textContent=d.comments.length;$('#comments').innerHTML=d.comments.map(c=>`<div class="comment"><div class="avatar tiny">${c.author.slice(0,2).toUpperCase()}</div><div><strong>${esc(c.author)}<small>${fmtDate(c.createdAt)}</small></strong><p>${esc(c.content)}</p></div></div>`).join('');$('#timeline').innerHTML=d.auditTrail.map(a=>`<div><i></i><p><strong>${a.action.replaceAll('_',' ')}</strong><span>${esc(a.detail)}</span><small>${esc(a.actor)} · ${fmtDate(a.createdAt)}</small></p></div>`).join('');$$('.decision').forEach(b=>b.disabled=!d.editable);$('#comment').disabled=!d.editable}
async function bulk(status){const ids=state.selected.size?[...state.selected]:state.pageData.content.map(t=>t.id);if(!ids.length)return;try{const r=await request('/transactions/bulk-decision',{method:'POST',body:JSON.stringify({ids,status})});toast(`${r.updated} işlem güncellendi`);loadTransactions()}catch(e){toast(e.message)}}
function legacySwitchSection(section){state.section=section;$$('[id$="-section"]').forEach(s=>s.classList.add('hidden'));$(`#${section}-section`).classList.remove('hidden');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section===section));const title={transactions:'Transaction Monitoring',rules:'Detection Rules',settings:'Workspace Settings'}[section];$('#page-title').textContent=title;$('#breadcrumb').textContent=`FRAUD OPERATIONS / ${section.toUpperCase()}`;if(section==='rules')loadRules()}
$$('.nav-item').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));$$('[data-channel]').forEach(b=>b.onclick=()=>{$$('[data-channel]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.channel=b.dataset.channel;state.page=0;loadTransactions()});$('#user').onchange=e=>{state.user=e.target.value;const initials=state.user.slice(0,2).toUpperCase();$('#avatar').textContent=initials;$('#settings-avatar').textContent=initials;$('#settings-user').textContent=state.user;loadTransactions()};$('#status').onchange=e=>{state.status=e.target.value;state.page=0;loadTransactions()};$('#score').onchange=e=>{state.score=e.target.value;state.page=0;loadTransactions()};$('#search-form').onsubmit=e=>{e.preventDefault();state.search=$('#search').value;state.page=0;loadTransactions()};$('#clear').onclick=()=>{$('#search').value='';$('#status').value='';$('#score').value='';state.search=state.status=state.score='';state.page=0;loadTransactions()};$('#prev').onclick=()=>{state.page--;loadTransactions()};$('#next').onclick=()=>{state.page++;loadTransactions()};$('#select-all').onchange=e=>{state.selected=new Set(e.target.checked?state.pageData.content.map(t=>t.id):[]);$$('.row-check').forEach(c=>c.checked=e.target.checked);$('#selection-label').textContent=state.selected.size?`${state.selected.size} selected`:'Current page'};$('#bulk-fraud').onclick=()=>bulk('FRAUD');$('#bulk-safe').onclick=()=>bulk('NOT_FRAUD');
$('#generate').onclick=async()=>{const r=await request(`/generator/generate?count=15&channel=${state.channel}`,{method:'POST'});toast(`${r.generated} yeni işlem üretildi`);loadTransactions()};$('#stream').onclick=async()=>{const r=await request(state.running?'/generator/stop':'/generator/start?rate=2',{method:'POST'});state.running=r.running;renderGenerator()};function renderGenerator(){$('#generator-label').textContent=state.running?'RUNNING':'PAUSED';$('#stream').textContent=state.running?'■ Stop stream':'▶ Start stream';toast(state.running?'Canlı üretim başladı':'Canlı üretim durduruldu')}
$$('[data-close="detail"]').forEach(b=>b.onclick=()=>$('#detail-overlay').classList.add('hidden'));$$('[data-close="rule"]').forEach(b=>b.onclick=()=>$('#rule-overlay').classList.add('hidden'));$('#new-rule').onclick=()=>$('#rule-overlay').classList.remove('hidden');$('#comment-form').onsubmit=async e=>{e.preventDefault();const content=$('#comment').value.trim();if(!content)return;try{state.detail=await request(`/transactions/${state.detail.transaction.id}/comments`,{method:'POST',body:JSON.stringify({content})});$('#comment').value='';renderDetail();toast('Comment added')}catch(err){toast(err.message)}};$$('.decision').forEach(b=>b.onclick=async()=>{try{state.detail=await request(`/transactions/${state.detail.transaction.id}/decision`,{method:'POST',body:JSON.stringify({status:b.dataset.status})});renderDetail();loadTransactions();toast(`Decision saved: ${labels[b.dataset.status]}`)}catch(e){toast(e.message)}});
$('#rule-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),payload=Object.fromEntries(f.entries());payload.scoreContribution=Number(payload.scoreContribution);payload.active=true;try{await request('/rules',{method:'POST',body:JSON.stringify(payload)});$('#rule-overlay').classList.add('hidden');e.target.reset();toast('Rule created and activated');loadRules()}catch(err){toast(err.message)}};
async function legacyInit(){await loadDefaultView(false);await Promise.all([loadTransactions(),loadRules()]);const g=await request('/generator/status');state.running=g.running;$('#generator-label').textContent=state.running?'RUNNING':'PAUSED';setInterval(()=>{if(state.running&&state.section==='transactions')loadTransactions()},3000)}init();

$$('.column-filter').forEach(button=>button.onclick=()=>openColumnFilter(button.dataset.filterField));
$$('[data-close="filter"]').forEach(button=>button.onclick=()=>$('#filter-overlay').classList.add('hidden'));
$('#filter-form').onsubmit=e=>{
  e.preventDefault();const field=state.editingFilter,config=filterColumns[field],input=$('#filter-value');
  if(!field||!input||input.value===''){toast('Filter value is required');return}
  let value=input.value;if(config.type==='date')value=new Date(value).toISOString();
  state.columnFilters[field]={field,operator:$('#filter-operator').value,value};state.page=0;
  $('#filter-overlay').classList.add('hidden');loadTransactions();
};
$('#remove-filter').onclick=()=>{if(state.editingFilter)delete state.columnFilters[state.editingFilter];state.page=0;$('#filter-overlay').classList.add('hidden');loadTransactions()};
$('#clear-column-filters').onclick=()=>{state.columnFilters={};state.page=0;loadTransactions()};
$('#clear').onclick=()=>{$('#search').value='';$('#status').value='';$('#score').value='';state.search=state.status=state.score='';state.columnFilters=[];state.page=0;loadTransactions()};

// Central filter builder: column -> comparison -> value.
function renderActiveFilters(){
  const filters=state.columnFilters,bar=$('#active-filter-bar');
  bar.classList.toggle('hidden',filters.length===0);
  $('#filter-chips').innerHTML=filters.map(f=>`<span class="filter-chip editable" data-edit-filter="${f.id}" title="Edit filter"><strong>${filterColumns[f.field].label}</strong><code>${f.operator} · ${esc(filterDisplayValue(f))}</code><button type="button" data-remove-filter="${f.id}" title="Remove">×</button></span>`).join('');
  $$('[data-edit-filter]').forEach(chip=>chip.onclick=()=>openFilter(chip.dataset.editFilter));
  $$('[data-remove-filter]').forEach(button=>button.onclick=e=>{e.stopPropagation();state.columnFilters=state.columnFilters.filter(f=>f.id!==button.dataset.removeFilter);state.page=0;loadTransactions()});
}

function prepareFilterUi(){
  $$('.column-filter').forEach(button=>button.remove());
  const clear=$('#clear');
  if(!$('#add-filter'))clear.insertAdjacentHTML('beforebegin','<button type="button" class="btn primary" id="add-filter">+ Add filter</button>');
  const body=$('#filter-overlay .filter-form-body');
  if(!$('#filter-column'))body.insertAdjacentHTML('afterbegin','<label>Column<select id="filter-column"></select></label>');
  const operatorLabel=$('#filter-operator').closest('label');
  if(operatorLabel)operatorLabel.childNodes[0].textContent='Comparison';
  $('#filter-overlay .eyebrow').textContent='TRANSACTION FILTER';
  refreshFilterColumnOptions();
  $('#add-filter').onclick=()=>openFilter();
  $('#filter-column').onchange=()=>renderFilterControls();
}

function refreshFilterColumnOptions(){
  if(!$('#filter-column'))return;
  $('#filter-column').innerHTML=channelColumnKeys[state.channel].map(value=>`<option value="${value}">${filterColumns[value].label}</option>`).join('');
}

function renderFilterControls(operator,value){
  const field=$('#filter-column').value,config=filterColumns[field];
  $('#filter-operator').innerHTML=operatorSets[config.type].map(([optionValue,label])=>`<option value="${optionValue}">${label}</option>`).join('');
  $('#filter-operator').value=operator||operatorSets[config.type][0][0];
  const current=value||'';
  if(config.type==='enum'||config.type==='boolean')$('#filter-value-host').innerHTML=`<select id="filter-value">${optionMarkup(config.options)}</select>`;
  else if(config.type==='date')$('#filter-value-host').innerHTML=current.toLocaleLowerCase('tr-TR')==='n/a'?'<input id="filter-value" type="text" value="N/A">':`<input id="filter-value" type="datetime-local" value="${current?new Date(current).toISOString().slice(0,16):''}">`;
  else if(config.type==='number')$('#filter-value-host').innerHTML=current.toLocaleLowerCase('tr-TR')==='n/a'?'<input id="filter-value" type="text" value="N/A">':`<input id="filter-value" type="number" step="any" value="${esc(current)}" placeholder="Enter numeric value">`;
  else $('#filter-value-host').innerHTML=`<input id="filter-value" type="text" maxlength="200" value="${esc(current)}" placeholder="Enter filter value">`;
  if(current&&$('#filter-value'))$('#filter-value').value=config.type==='date'&&current.toLocaleLowerCase('tr-TR')!=='n/a'?new Date(current).toISOString().slice(0,16):current;
  $('#filter-help').textContent=config.type==='string'?'Text filters are case-insensitive. Regex patterns are limited to 120 characters.':config.type==='date'?'The selected date and time is compared exactly in your local timezone.':'Multiple filters are combined with AND.';
}

function openFilter(filterId=null){
  const existing=state.columnFilters.find(f=>f.id===filterId);
  state.editingFilterId=existing?.id||null;
  $('#filter-title').textContent=existing?'Edit filter':'Add filter';
  $('#filter-column').value=existing?.field||channelColumnKeys[state.channel][0];
  renderFilterControls(existing?.operator,existing?.value);
  $('#remove-filter').classList.toggle('hidden',!existing);
  $('#filter-overlay').classList.remove('hidden');
}

prepareFilterUi();
$('#filter-form').onsubmit=e=>{
  e.preventDefault();
  const field=$('#filter-column').value,config=filterColumns[field],input=$('#filter-value');
  if(!field||!input||input.value===''){toast('Filter value is required');return}
  let value=input.value;
  if(config.type==='date'&&value.toLocaleLowerCase('tr-TR')!=='n/a')value=new Date(value).toISOString();
  const id=state.editingFilterId||`filter-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const filter={id,field,operator:$('#filter-operator').value,value};
  const index=state.columnFilters.findIndex(item=>item.id===id);
  if(index>=0)state.columnFilters[index]=filter;else state.columnFilters.push(filter);
  state.page=0;$('#filter-overlay').classList.add('hidden');loadTransactions();
};
$('#remove-filter').onclick=()=>{if(state.editingFilterId)state.columnFilters=state.columnFilters.filter(f=>f.id!==state.editingFilterId);state.page=0;$('#filter-overlay').classList.add('hidden');loadTransactions()};
$('#clear-column-filters').onclick=()=>{state.columnFilters=[];state.page=0;loadTransactions()};

// Drag-and-drop column ordering. Selection and row-action columns stay fixed.
let defaultColumnOrder=[...channelColumnKeys[state.channel]];
const columnOrderStorageKey=()=>`kostak.transaction-column-order.v2.${state.user}.${state.channel}`;
let draggedColumnKey=null;
let pointerDraggedColumnKey=null;
let columnOrder=loadColumnOrder();
let columnObserver=null;

function loadColumnOrder(){
  try{
    const saved=JSON.parse(localStorage.getItem(columnOrderStorageKey())||'[]');
    if(Array.isArray(saved)&&saved.length===defaultColumnOrder.length&&defaultColumnOrder.every(key=>saved.includes(key)))return saved;
  }catch(_error){}
  return [...defaultColumnOrder];
}

function saveColumnOrder(){
  try{localStorage.setItem(columnOrderStorageKey(),JSON.stringify(columnOrder))}catch(_error){}
}

function renderChannelHeader(){
  defaultColumnOrder=[...channelColumnKeys[state.channel]];
  const header=$('.wide-table thead tr');
  const headerLabel=key=>key==='riskScore'?'Score':state.channel==='WALLET'&&key==='assignedAnalyst'?'Assigned':['POS','PHYSICAL_POS'].includes(state.channel)&&key==='assignedAnalyst'?'Assignee':key==='reviewStatus'?'Status':filterColumns[key].label;
  header.innerHTML=`<th class="check"><input type="checkbox" id="select-all"></th>${defaultColumnOrder.map(key=>`<th><span>${headerLabel(key)}</span></th>`).join('')}<th></th>`;
  $('.wide-table').style.minWidth=state.channel==='POS'?'6700px':state.channel==='PHYSICAL_POS'?'4900px':state.channel==='WALLET'?'3550px':'1900px';
  $('#select-all').onchange=event=>{state.selected=new Set(event.target.checked&&state.pageData?state.pageData.content.map(t=>t.id):[]);$$('.row-check').forEach(c=>c.checked=event.target.checked);$('#selection-label').textContent=state.selected.size?`${state.selected.size} selected`:'Current page'};
  $('#status option[value="FRAUD"]').textContent=labels.FRAUD;
  $('#status option[value="NOT_FRAUD"]').textContent=labels.NOT_FRAUD;
  refreshFilterColumnOptions();
  $('#search').placeholder=state.channel==='WALLET'?'Search ID, account, IBAN, name, email, description...':state.channel==='POS'?'Search ID, card, merchant, email, token, invoice...':'Search ID, card, merchant, terminal, IMEI, invoice...';
}

function reorderCells(container){
  const cells=[...container.children];
  if(cells.length<defaultColumnOrder.length+2)return;
  const fixedStart=cells[0],fixedEnd=cells[cells.length-1];
  const movable=new Map(cells.slice(1,-1).map(cell=>[cell.dataset.columnKey,cell]));
  container.replaceChildren(fixedStart,...columnOrder.map(key=>movable.get(key)).filter(Boolean),fixedEnd);
}

function transactionColumnValue(tx,key){
  if(key==='instrument')return tx.cardRef||tx.senderRef||'';
  if(key==='counterparty')return tx.merchantRef||tx.receiverRef||'';
  if(key==='ruleSummary')return ruleSummary(tx);
  return tx[key]??'N/A';
}

async function copyCellValue(value){
  try{
    await navigator.clipboard.writeText(String(value));
    toast('Value copied');
  }catch(_error){
    const area=document.createElement('textarea');area.value=String(value);area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove();toast('Value copied');
  }
}

function addEqualFilter(field,value){
  const normalized=String(value);
  const duplicate=state.columnFilters.some(filter=>filter.field===field&&filter.operator==='EQ'&&filter.value===normalized);
  if(!duplicate)state.columnFilters.push({id:`quick-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,field,operator:'EQ',value:normalized});
  state.page=0;
  loadTransactions();
}

function decorateCellActions(row){
  const tx=state.pageData?.content?.find(item=>item.id===row.dataset.id);
  if(!tx)return;
  [...row.children].slice(1,-1).forEach(cell=>{
    const field=cell.dataset.columnKey;
    if(!field||cell.querySelector('.cell-hover-actions'))return;
    const value=transactionColumnValue(tx,field);
    const actions=document.createElement('span');actions.className='cell-hover-actions';
    actions.innerHTML='<button type="button" data-cell-action="copy" title="Copy value">Copy</button><button type="button" data-cell-action="filter" title="Filter equal to this value">Filter</button>';
    actions.querySelector('[data-cell-action="copy"]').onclick=event=>{event.stopPropagation();copyCellValue(value)};
    actions.querySelector('[data-cell-action="filter"]').onclick=event=>{event.stopPropagation();addEqualFilter(field,value)};
    cell.append(actions);
  });
}

function applyColumnOrder(){
  reorderCells($('.wide-table thead tr'));
  $$('#tx-body tr').forEach(row=>{
    const cells=[...row.children];
    if(!cells[1]?.dataset.columnKey)defaultColumnOrder.forEach((key,index)=>{if(cells[index+1])cells[index+1].dataset.columnKey=key});
    reorderCells(row);
    decorateCellActions(row);
  });
}

function moveColumn(sourceKey,targetKey){
  if(!sourceKey||!targetKey||sourceKey===targetKey)return;
  const from=columnOrder.indexOf(sourceKey),to=columnOrder.indexOf(targetKey);
  if(from<0||to<0)return;
  columnOrder.splice(from,1);
  columnOrder.splice(to,0,sourceKey);
  saveColumnOrder();
  applyColumnOrder();
}

function prepareColumnReordering(){
  const header=$('.wide-table thead tr'),headers=[...header.children].slice(1,-1);
  defaultColumnOrder.forEach((key,index)=>{
    const th=headers[index];
    if(!th)return;
    th.dataset.columnKey=key;
    th.draggable=true;
    th.tabIndex=0;
    th.classList.add('draggable-column');
    th.title='Drag to reorder column (Alt + Arrow keys also supported)';
    th.addEventListener('dragstart',event=>{
      draggedColumnKey=key;
      pointerDraggedColumnKey=null;
      th.classList.add('column-dragging');
      if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',key)}
    });
    th.addEventListener('dragover',event=>{event.preventDefault();th.classList.add('column-drag-over');if(event.dataTransfer)event.dataTransfer.dropEffect='move'});
    th.addEventListener('dragleave',()=>th.classList.remove('column-drag-over'));
    th.addEventListener('drop',event=>{
      event.preventDefault();
      th.classList.remove('column-drag-over');
      moveColumn(event.dataTransfer?.getData('text/plain')||draggedColumnKey,key);
    });
    th.addEventListener('dragend',()=>{
      draggedColumnKey=null;
      $$('.draggable-column').forEach(item=>item.classList.remove('column-dragging','column-drag-over'));
    });
    th.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      pointerDraggedColumnKey=key;
      th.classList.add('column-dragging');
    });
    th.addEventListener('pointerenter',event=>{
      if(pointerDraggedColumnKey&&event.buttons===1)th.classList.add('column-drag-over');
    });
    th.addEventListener('pointerleave',()=>th.classList.remove('column-drag-over'));
    th.addEventListener('pointerup',()=>{
      const sourceKey=pointerDraggedColumnKey;
      pointerDraggedColumnKey=null;
      $$('.draggable-column').forEach(item=>item.classList.remove('column-dragging','column-drag-over'));
      moveColumn(sourceKey,key);
    });
    th.addEventListener('keydown',event=>{
      if(!event.altKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const currentIndex=columnOrder.indexOf(key);
      const targetIndex=currentIndex+(event.key==='ArrowLeft'?-1:1);
      if(targetIndex<0||targetIndex>=columnOrder.length)return;
      moveColumn(key,columnOrder[targetIndex]);
      $(`th[data-column-key="${key}"]`)?.focus();
    });
  });
  document.addEventListener('pointerup',()=>{
    pointerDraggedColumnKey=null;
    $$('.draggable-column').forEach(item=>item.classList.remove('column-dragging','column-drag-over'));
  });
  if(!$('#column-reorder-style'))document.head.insertAdjacentHTML('beforeend','<style id="column-reorder-style">.wide-table th.draggable-column{cursor:grab;user-select:none;transition:opacity .15s,box-shadow .15s,background .15s}.wide-table th.draggable-column:active{cursor:grabbing}.wide-table th.column-dragging{opacity:.35}.wide-table th.column-drag-over{background:#102724;box-shadow:inset 3px 0 #2dd4bf;color:#2dd4bf}.wide-table td[data-column-key]{position:relative}.cell-hover-actions{position:absolute;z-index:4;right:4px;top:4px;display:flex;gap:3px;opacity:0;pointer-events:none;transform:translateY(-2px);transition:opacity .12s,transform .12s}.wide-table td[data-column-key]:hover .cell-hover-actions,.wide-table td[data-column-key]:focus-within .cell-hover-actions{opacity:1;pointer-events:auto;transform:translateY(0)}.cell-hover-actions button{border:1px solid #315064;background:#101c28;color:#9fb9ca;border-radius:3px;padding:3px 5px;font-size:8px;font-weight:700;box-shadow:0 3px 10px #0009}.cell-hover-actions button:hover{border-color:#2dd4bf;background:#12302e;color:#73e0d2}.rule-summary{position:relative;display:inline-flex;white-space:nowrap;color:#73e0d2;font-weight:700}.rule-tooltip{position:absolute;z-index:12;left:0;top:calc(100% + 8px);display:none;min-width:230px;max-width:320px;padding:10px;border:1px solid #315064;border-radius:5px;background:#0a1520;box-shadow:0 10px 30px #000c;color:#b9c7d6;font-weight:400}.rule-summary:hover .rule-tooltip{display:grid;gap:6px}.rule-tooltip strong{color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.rule-tooltip span{display:flex;justify-content:space-between;gap:16px}.rule-tooltip b{color:#f6c453}</style>');
  if(!$('#assigned-column-style'))document.head.insertAdjacentHTML('beforeend','<style id="assigned-column-style">.assigned-user{display:inline-flex;padding:4px 7px;border:1px solid #315382;border-radius:3px;background:#14243c;color:#74aaff;font:700 9px "JetBrains Mono";white-space:nowrap}</style>');
  if(!$('#virtual-pos-column-style'))document.head.insertAdjacentHTML('beforeend','<style id="virtual-pos-column-style">.resolution,.merchant-risk{display:inline-flex;padding:4px 6px;border:1px solid;border-radius:3px;font-size:8px;font-weight:700;white-space:nowrap}.resolution-approved,.risk-level-low{color:#5cdda0;border-color:#295b45;background:#11261d}.resolution-escalated,.risk-level-mid{color:#f4c55e;border-color:#5d4a26;background:#251f14}.resolution-declined,.risk-level-high{color:#ff7c89;border-color:#71323c;background:#2c161b}</style>');
  if(columnObserver)columnObserver.disconnect();
  columnObserver=new MutationObserver(()=>applyColumnOrder());
  columnObserver.observe($('#tx-body'),{childList:true});
  applyColumnOrder();
}

renderChannelHeader();
columnOrder=loadColumnOrder();
prepareColumnReordering();

// Server-persisted default view per demo user and transaction channel.
function validColumnOrder(order){
  return Array.isArray(order)&&order.length===defaultColumnOrder.length&&new Set(order).size===defaultColumnOrder.length&&defaultColumnOrder.every(key=>order.includes(key));
}

async function loadDefaultView(reload=true){
  try{
    const result=await request(`/views/default?channel=${encodeURIComponent(state.channel)}`),view=result.view;
    if(view){
      const allowed=new Set(defaultColumnOrder);
      state.columnFilters=(view.filters||[]).filter(filter=>allowed.has(filter.field)).map((filter,index)=>({...filter,id:`default-${Date.now()}-${index}`}));
      columnOrder=validColumnOrder(view.columnOrder)?[...view.columnOrder]:[...defaultColumnOrder];
    }else{
      state.columnFilters=[];
      columnOrder=[...defaultColumnOrder];
    }
    state.page=0;
    saveColumnOrder();
    applyColumnOrder();
    renderActiveFilters();
    if(reload)await loadTransactions();
    return Boolean(view);
  }catch(error){toast(error.message);return false}
}

async function saveDefaultView(){
  const filters=state.columnFilters.map(({field,operator,value})=>({field,operator,value}));
  try{
    await request('/views/default',{method:'PUT',body:JSON.stringify({channel:state.channel,filters,columnOrder})});
    toast(`Default saved for ${labels[state.channel]} · ${state.user}`);
  }catch(error){toast(error.message)}
}

function prepareDefaultViewUi(){
  if(!$('#set-default-view'))$('#add-filter').insertAdjacentHTML('afterend','<button type="button" class="btn ghost" id="set-default-view" title="Save current filters and column order for this user and channel">Set as default</button>');
  $('#set-default-view').onclick=saveDefaultView;
  $$('[data-channel]').forEach(button=>button.onclick=async()=>{
    $$('[data-channel]').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    state.channel=button.dataset.channel;
    renderChannelHeader();
    columnOrder=loadColumnOrder();
    prepareColumnReordering();
    await loadDefaultView(false);
    loadTransactions();
  });
  $('#user').onchange=async event=>{
    state.user=event.target.value;
    const initials=state.user.slice(0,2).toUpperCase();
    $('#avatar').textContent=initials;$('#settings-avatar').textContent=initials;$('#settings-user').textContent=state.user;
    await loadDefaultView(false);
    loadTransactions();
  };
}

prepareDefaultViewUi();

// Visual, channel-aware rule builder. Operators never enter code or expressions.
const ruleBuilderExcludedFields=new Set(['id','ruleSummary','riskScore','reviewStatus','assignedAnalyst']);
const ruleBuilderOperators={
  string:[['EQ','Equal'],['NE','Not equal'],['CONTAINS','Contains'],['NOT_CONTAINS','Not contains'],['STARTS_WITH','Starts with'],['ENDS_WITH','Ends with']],
  number:[['EQ','Equal'],['NE','Not equal'],['GT','Greater than'],['GTE','Greater or equal'],['LT','Less than'],['LTE','Less or equal']],
  date:[['EQ','Equal'],['NE','Not equal'],['GT','After'],['GTE','After or equal'],['LT','Before'],['LTE','Before or equal']],
  enum:[['EQ','Equal'],['NE','Not equal']],boolean:[['EQ','Equal'],['NE','Not equal']]
};
const ruleAggregateLabels={COUNT:'Count',SUM:'Sum',AVG:'Average',MAX:'Maximum',MIN:'Minimum',DISTINCT:'Distinct count'};
const ruleOperatorLabels={EQ:'Equal',NE:'Not equal',CONTAINS:'Contains',NOT_CONTAINS:'Not contains',STARTS_WITH:'Starts with',ENDS_WITH:'Ends with',GT:'Greater than',GTE:'Greater or equal',LT:'Less than',LTE:'Less or equal'};
const ruleArithmeticLabels={ADD:'Addition',SUBTRACT:'Subtraction',MULTIPLY:'Multiplication',DIVIDE:'Division'};
const ruleArithmeticSymbols={ADD:'+',SUBTRACT:'-',MULTIPLY:'×',DIVIDE:'÷'};
const ruleComparatorSymbols={EQ:'=',NE:'≠',GT:'>',GTE:'≥',LT:'<',LTE:'≤',CONTAINS:'contains',NOT_CONTAINS:'not contains'};
let noCodeRuleState=null;

const ruleBuilderExtraFields={WALLET:['transactionType'],POS:['transactionType','merchantRisk','threeDs'],PHYSICAL_POS:['transactionType','merchantRisk','threeDs']};
function ruleFields(channel){return [...new Set([...channelColumnKeys[channel],...(ruleBuilderExtraFields[channel]||[])])].filter(key=>!ruleBuilderExcludedFields.has(key))}
function ruleFieldOptions(channel,keys=ruleFields(channel)){return keys.map(key=>`<option value="${key}">${esc(filterColumns[key].label)}</option>`).join('')}
function ruleValueControl(condition,index){
  const config=filterColumns[condition.field];
  if(config.type==='enum'||config.type==='boolean')return `<select data-rule-filter-value="${index}">${optionMarkup(config.options)}</select>`;
  if(config.type==='number')return `<input data-rule-filter-value="${index}" type="number" step="any" value="${esc(condition.value)}" placeholder="Value">`;
  if(config.type==='date')return `<input data-rule-filter-value="${index}" type="datetime-local" value="${esc(condition.value)}">`;
  return `<input data-rule-filter-value="${index}" type="text" maxlength="200" value="${esc(condition.value)}" placeholder="Value">`;
}
function defaultRuleFilter(field){const config=filterColumns[field];return {connector:'AND',field,operator:ruleBuilderOperators[config.type][0][0],value:config.type==='number'?'0':config.type==='boolean'?'true':config.type==='enum'?(Array.isArray(config.options[0])?config.options[0][0]:config.options[0]):''}}
function legacyResetNoCodeRule(channel=state.channel){
  const fields=ruleFields(channel),numeric=fields.filter(key=>filterColumns[key].type==='number');
  noCodeRuleState={channel,window:{value:1,unit:'HOUR'},groupBy:'',filters:[],aggregates:[{connector:'AND',metric:'COUNT',field:'',operator:'GT',value:'10'}],numericFields:numeric};
}
function aggregateFieldOptions(item){
  if(item.metric==='COUNT')return '<option value="">Transactions</option>';
  const keys=item.metric==='DISTINCT'?ruleFields(noCodeRuleState.channel):noCodeRuleState.numericFields;
  return ruleFieldOptions(noCodeRuleState.channel,keys);
}
function renderNoCodeConditions(){
  const host=$('#rule-filter-list');
  host.innerHTML=noCodeRuleState.filters.length?noCodeRuleState.filters.map((item,index)=>{
    const config=filterColumns[item.field],operators=ruleBuilderOperators[config.type];
    return `<div class="logic-row"><div class="logic-join">${index===0?'<span>WHERE</span>':`<select data-rule-filter-connector="${index}"><option>AND</option><option>OR</option></select>`}</div><select data-rule-filter-field="${index}">${ruleFieldOptions(noCodeRuleState.channel)}</select><select data-rule-filter-operator="${index}">${operators.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select>${ruleValueControl(item,index)}<button type="button" class="remove-logic" data-remove-rule-filter="${index}" title="Remove condition">×</button></div>`;
  }).join(''):'<div class="builder-empty">Optional: add transaction conditions to narrow which records enter the time window.</div>';
  noCodeRuleState.filters.forEach((item,index)=>{
    const field=$(`[data-rule-filter-field="${index}"]`),operator=$(`[data-rule-filter-operator="${index}"]`),connector=$(`[data-rule-filter-connector="${index}"]`),value=$(`[data-rule-filter-value="${index}"]`);
    field.value=item.field;operator.value=item.operator;if(connector)connector.value=item.connector;if(value)value.value=item.value;
    field.onchange=()=>{noCodeRuleState.filters[index]=defaultRuleFilter(field.value);noCodeRuleState.filters[index].connector=item.connector;renderNoCodeConditions();renderRulePreview()};
    operator.onchange=()=>{item.operator=operator.value;renderRulePreview()};if(connector)connector.onchange=()=>{item.connector=connector.value;renderRulePreview()};
    value.oninput=()=>{item.value=value.value;renderRulePreview()};value.onchange=value.oninput;
  });
  $$('[data-remove-rule-filter]').forEach(button=>button.onclick=()=>{noCodeRuleState.filters.splice(Number(button.dataset.removeRuleFilter),1);renderNoCodeConditions();renderRulePreview()});
}
function renderNoCodeAggregates(){
  $('#rule-aggregate-list').innerHTML=noCodeRuleState.aggregates.map((item,index)=>`<div class="logic-row aggregate-row"><div class="logic-join">${index===0?'<span>THEN</span>':`<select data-rule-aggregate-connector="${index}"><option>AND</option><option>OR</option></select>`}</div><select data-rule-metric="${index}">${Object.entries(ruleAggregateLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><select data-rule-aggregate-field="${index}" ${item.metric==='COUNT'?'disabled':''}>${aggregateFieldOptions(item)}</select><select data-rule-aggregate-operator="${index}">${ruleBuilderOperators.number.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><input data-rule-aggregate-value="${index}" type="number" min="0" step="any" value="${esc(item.value)}" placeholder="Threshold"><button type="button" class="remove-logic" data-remove-rule-aggregate="${index}" title="Remove aggregate" ${noCodeRuleState.aggregates.length===1?'disabled':''}>×</button></div>`).join('');
  noCodeRuleState.aggregates.forEach((item,index)=>{
    const metric=$(`[data-rule-metric="${index}"]`),field=$(`[data-rule-aggregate-field="${index}"]`),operator=$(`[data-rule-aggregate-operator="${index}"]`),value=$(`[data-rule-aggregate-value="${index}"]`),connector=$(`[data-rule-aggregate-connector="${index}"]`);
    metric.value=item.metric;field.value=item.field;operator.value=item.operator;if(connector)connector.value=item.connector;
    metric.onchange=()=>{item.metric=metric.value;const keys=item.metric==='COUNT'?[]:item.metric==='DISTINCT'?ruleFields(noCodeRuleState.channel):noCodeRuleState.numericFields;item.field=keys[0]||'';renderNoCodeAggregates();renderRulePreview()};
    field.onchange=()=>{item.field=field.value;renderRulePreview()};operator.onchange=()=>{item.operator=operator.value;renderRulePreview()};value.oninput=()=>{item.value=value.value;renderRulePreview()};
    if(connector)connector.onchange=()=>{item.connector=connector.value;renderRulePreview()};
  });
  $$('[data-remove-rule-aggregate]').forEach(button=>button.onclick=()=>{noCodeRuleState.aggregates.splice(Number(button.dataset.removeRuleAggregate),1);renderNoCodeAggregates();renderRulePreview()});
}
function legacyRenderRulePreview(){
  if(!noCodeRuleState||!$('#rule-preview'))return;
  const unit={MINUTE:'minute',HOUR:'hour',DAY:'day'}[noCodeRuleState.window.unit],group=noCodeRuleState.groupBy?filterColumns[noCodeRuleState.groupBy].label:'all transactions';
  const filters=noCodeRuleState.filters.map((item,index)=>`${index?item.connector+' ':''}${filterColumns[item.field].label} ${ruleOperatorLabels[item.operator]} ${item.value||'…'}`).join(' ');
  const aggregates=noCodeRuleState.aggregates.map((item,index)=>`${index?item.connector+' ':''}${ruleAggregateLabels[item.metric]}${item.field?` of ${filterColumns[item.field].label}`:''} ${ruleOperatorLabels[item.operator]} ${item.value||'…'}`).join(' ');
  $('#rule-preview').innerHTML=`<span>HUMAN-READABLE PREVIEW</span><p>Within the last <strong>${noCodeRuleState.window.value} ${unit}${Number(noCodeRuleState.window.value)===1?'':'s'}</strong>, group by <strong>${esc(group)}</strong>${filters?`, include records where <strong>${esc(filters)}</strong>`:''}. Trigger when <strong>${esc(aggregates)}</strong>.</p><small>Time calculations always use transaction_date.</small>`;
}
function legacyRenderNoCodeBuilder(){
  $('#rule-channel').value=noCodeRuleState.channel;$('#rule-window-value').value=noCodeRuleState.window.value;$('#rule-window-unit').value=noCodeRuleState.window.unit;
  $('#rule-group-by').innerHTML=`<option value="">No grouping — all transactions</option>${ruleFieldOptions(noCodeRuleState.channel)}`;$('#rule-group-by').value=noCodeRuleState.groupBy;
  renderNoCodeConditions();renderNoCodeAggregates();renderRulePreview();
}
function legacyPrepareNoCodeRuleBuilder(){
  const form=$('#rule-form');
  form.className='modal rule-builder-modal';
  form.innerHTML=`<header><div><p class="eyebrow">NO-CODE RULE BUILDER</p><h2>Create detection rule</h2><small>Build channel-specific behavioral rules without writing code.</small></div><button type="button" class="close" data-close-rule>×</button></header><div class="rule-builder-body"><section class="rule-basics"><label>Rule name<input id="rule-name" required maxlength="100" placeholder="e.g. Sender velocity in one hour"></label><label>Description<textarea id="rule-description" maxlength="400" placeholder="Explain why this behavior is risky"></textarea></label><div class="form-row"><label>Channel<select id="rule-channel"><option value="WALLET">Wallet</option><option value="POS">Virtual POS</option><option value="PHYSICAL_POS">Physical POS</option></select></label><label>Risk points<input id="rule-points" type="number" min="1" max="100" value="60" required></label></div></section><section class="builder-section"><div class="builder-section-head"><div><span>1</span><h3>Time window and grouping</h3><p>Analyze transactions relative to the current transaction.</p></div></div><div class="window-grid"><label>Look back<input id="rule-window-value" type="number" min="1" max="10000" value="1"></label><label>Unit<select id="rule-window-unit"><option value="MINUTE">Minutes</option><option value="HOUR">Hours</option><option value="DAY">Days</option></select></label><label>Time basis<div class="fixed-field">transaction_date <small>Default</small></div></label><label>Group matching transactions by<select id="rule-group-by"></select></label></div></section><section class="builder-section"><div class="builder-section-head"><div><span>2</span><h3>Transaction conditions</h3><p>Optional filters combined with AND or OR.</p></div><button type="button" class="btn ghost small-btn" id="add-rule-filter">+ Add condition</button></div><div id="rule-filter-list" class="logic-list"></div></section><section class="builder-section"><div class="builder-section-head"><div><span>3</span><h3>Aggregation conditions</h3><p>Count, sum, average, minimum, maximum or distinct values.</p></div><button type="button" class="btn ghost small-btn" id="add-rule-aggregate">+ Add aggregate</button></div><div id="rule-aggregate-list" class="logic-list"></div></section><div class="rule-preview" id="rule-preview"></div></div><footer class="modal-actions"><button type="button" class="btn ghost" data-close-rule>Cancel</button><button class="btn primary">Create and activate rule</button></footer>`;
  resetNoCodeRule();renderNoCodeBuilder();
  $('#rule-channel').onchange=()=>{resetNoCodeRule($('#rule-channel').value);renderNoCodeBuilder()};
  $('#rule-window-value').oninput=()=>{noCodeRuleState.window.value=Math.max(1,Number($('#rule-window-value').value)||1);renderRulePreview()};
  $('#rule-window-unit').onchange=()=>{noCodeRuleState.window.unit=$('#rule-window-unit').value;renderRulePreview()};
  $('#rule-group-by').onchange=()=>{noCodeRuleState.groupBy=$('#rule-group-by').value;renderRulePreview()};
  $('#add-rule-filter').onclick=()=>{const first=ruleFields(noCodeRuleState.channel)[0];noCodeRuleState.filters.push(defaultRuleFilter(first));renderNoCodeConditions();renderRulePreview()};
  $('#add-rule-aggregate').onclick=()=>{noCodeRuleState.aggregates.push({connector:'AND',metric:'COUNT',field:'',operator:'GT',value:'10'});renderNoCodeAggregates();renderRulePreview()};
  $$('[data-close-rule]').forEach(button=>button.onclick=()=>$('#rule-overlay').classList.add('hidden'));
  $('#new-rule').onclick=()=>{resetNoCodeRule(state.channel);$('#rule-name').value='';$('#rule-description').value='';$('#rule-points').value='60';renderNoCodeBuilder();$('#rule-overlay').classList.remove('hidden')};
  form.onsubmit=async event=>{
    event.preventDefault();
    if(noCodeRuleState.aggregates.some(item=>!item.value||item.metric!=='COUNT'&&!item.field)){toast('Complete every aggregation condition');return}
    if(noCodeRuleState.filters.some(item=>item.value==='')){toast('Complete every transaction condition');return}
    const payload={name:$('#rule-name').value.trim(),description:$('#rule-description').value.trim(),channel:noCodeRuleState.channel,scoreContribution:Number($('#rule-points').value),active:true,definition:{timeField:'transactionDate',window:{...noCodeRuleState.window},groupBy:noCodeRuleState.groupBy||null,filters:noCodeRuleState.filters.map(item=>({...item,value:String(item.value)})),aggregates:noCodeRuleState.aggregates.map(item=>({...item,value:Number(item.value)}))}};
    try{await request('/rules',{method:'POST',body:JSON.stringify(payload)});$('#rule-overlay').classList.add('hidden');toast('No-code rule created and evaluated');loadRules()}catch(error){toast(error.message)}
  };
}

function legacyRuleDefinitionMarkup(ruleItem){
  if(!ruleItem.definition)return `<div class="condition"><span>IF</span><code>${esc(ruleItem.fieldName)} ${esc(ruleItem.operator)} ${esc(ruleItem.expectedValue)}</code></div>`;
  const definition=ruleItem.definition,unit=definition.window.unit.toLowerCase(),scope=(definition.filters||[]).map((item,index)=>`${index?item.connector+' ':''}${filterColumns[item.field]?.label||item.field} ${ruleOperatorLabels[item.operator]||item.operator} ${item.value}`).join(' '),aggregates=definition.aggregates.map((item,index)=>`${index?item.connector+' ':''}${ruleAggregateLabels[item.metric]}${item.field?`(${filterColumns[item.field]?.label||item.field})`:'(transactions)'} ${ruleOperatorLabels[item.operator]} ${item.value}`).join(' ');
  return `<div class="rule-definition"><div><span>WINDOW</span><strong>Last ${definition.window.value} ${unit}${Number(definition.window.value)===1?'':'s'}</strong><small>transaction_date</small></div><div><span>GROUP BY</span><strong>${definition.groupBy?esc(filterColumns[definition.groupBy]?.label||definition.groupBy):'All transactions'}</strong></div>${scope?`<div class="rule-expression"><span>WHERE</span><code>${esc(scope)}</code></div>`:''}<div class="rule-expression"><span>AGGREGATE</span><code>${esc(aggregates)}</code></div></div>`;
}
loadRules=async function(){state.rules=await request('/rules');$('#rule-count').textContent=state.rules.filter(ruleItem=>ruleItem.active).length;$('#rule-grid').innerHTML=state.rules.map(ruleItem=>`<article class="rule-card ${ruleItem.definition?'advanced-rule':''}"><div class="rule-top"><span class="rule-state ${ruleItem.active?'on':'off'}">${ruleItem.active?'ACTIVE':'INACTIVE'}</span><span class="channel-chip">${labels[ruleItem.channel]}</span>${ruleItem.definition?'<span class="no-code-chip">NO-CODE</span>':''}</div><h3>${esc(ruleItem.name)}</h3><p>${esc(ruleItem.description||'No description')}</p>${ruleDefinitionMarkup(ruleItem)}<div class="rule-score"><span>Risk contribution</span><strong>+${ruleItem.scoreContribution}</strong></div><footer><small>v${ruleItem.version} · ${fmtDate(ruleItem.updatedAt)}</small><button class="switch" data-on="${ruleItem.active}" data-rule="${ruleItem.id}"><i></i></button></footer></article>`).join('');$$('[data-rule]').forEach(button=>button.onclick=async()=>{await request(`/rules/${button.dataset.rule}/toggle`,{method:'POST'});toast('Rule status updated');loadRules()})};

// Metric formula builder (v3). Each metric owns its time window and grouping field.
function defaultFormulaMetric(id){return {id,metric:'COUNT',field:'',window:{value:1,unit:'HOUR'},groupBy:''}}
function resetNoCodeRule(channel=state.channel){
  const fields=ruleFields(channel),numeric=fields.filter(key=>filterColumns[key].type==='number'),first=defaultFormulaMetric('metric_1');
  noCodeRuleState={channel,filters:[],metrics:[first],expression:{startMetric:first.id,operations:[],comparator:'GT',value:'10'},numericFields:numeric};
}
function metricLetter(index){return String.fromCharCode(65+index)}
function formulaMetricFieldOptions(item){
  if(item.metric==='COUNT')return '<option value="">Transactions</option>';
  return ruleFieldOptions(noCodeRuleState.channel,item.metric==='DISTINCT'?ruleFields(noCodeRuleState.channel):noCodeRuleState.numericFields);
}
function formulaMetricSelectOptions(){return noCodeRuleState.metrics.map((item,index)=>`<option value="${item.id}">${metricLetter(index)} — ${esc(ruleAggregateLabels[item.metric])}${item.field?` of ${esc(filterColumns[item.field]?.label||item.field)}`:''}</option>`).join('')}
function formulaMetricDescription(item,index){
  const unit={MINUTE:'minute',HOUR:'hour',DAY:'day'}[item.window.unit],aggregate=ruleAggregateLabels[item.metric]+(item.field?` of ${filterColumns[item.field]?.label||item.field}`:' of transactions'),group=item.groupBy?`grouped by ${filterColumns[item.groupBy]?.label||item.groupBy}`:'across all transactions';
  return `${metricLetter(index)} = ${aggregate} within the last ${item.window.value} ${unit}${Number(item.window.value)===1?'':'s'}, ${group}`;
}
function renderNoCodeMetrics(){
  $('#rule-metric-list').innerHTML=noCodeRuleState.metrics.map((item,index)=>`<article class="metric-builder-card"><header><span class="metric-alias">${metricLetter(index)}</span><div><strong>Metric ${metricLetter(index)}</strong><small>Independent aggregation scope</small></div><button type="button" class="remove-logic" data-remove-rule-metric="${index}" ${noCodeRuleState.metrics.length===1?'disabled':''}>×</button></header><div class="metric-builder-grid"><label>Aggregate<select data-rule-metric-kind="${index}">${Object.entries(ruleAggregateLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>Field<select data-rule-metric-field="${index}" ${item.metric==='COUNT'?'disabled':''}>${formulaMetricFieldOptions(item)}</select></label><label>Look back<input data-rule-metric-window="${index}" type="number" min="1" max="10000" value="${item.window.value}"></label><label>Unit<select data-rule-metric-unit="${index}"><option value="MINUTE">Minutes</option><option value="HOUR">Hours</option><option value="DAY">Days</option></select></label><label class="metric-group-field">Match the same entity using<select data-rule-metric-group="${index}"><option value="">No grouping — all transactions</option>${ruleFieldOptions(noCodeRuleState.channel)}</select><small>Empty, null and N/A identities are excluded automatically.</small></label><label>Time basis<div class="fixed-field">transaction_date <small>Default</small></div></label></div></article>`).join('');
  noCodeRuleState.metrics.forEach((item,index)=>{
    const kind=$(`[data-rule-metric-kind="${index}"]`),field=$(`[data-rule-metric-field="${index}"]`),windowInput=$(`[data-rule-metric-window="${index}"]`),unit=$(`[data-rule-metric-unit="${index}"]`),group=$(`[data-rule-metric-group="${index}"]`);
    kind.value=item.metric;field.value=item.field;unit.value=item.window.unit;group.value=item.groupBy;
    kind.onchange=()=>{item.metric=kind.value;const keys=item.metric==='COUNT'?[]:item.metric==='DISTINCT'?ruleFields(noCodeRuleState.channel):noCodeRuleState.numericFields;item.field=keys[0]||'';renderNoCodeMetrics();renderFormulaBuilder();renderRulePreview()};
    field.onchange=()=>{item.field=field.value;renderFormulaBuilder();renderRulePreview()};
    windowInput.oninput=()=>{item.window.value=Math.max(1,Number(windowInput.value)||1);renderRulePreview()};
    unit.onchange=()=>{item.window.unit=unit.value;renderRulePreview()};
    group.onchange=()=>{item.groupBy=group.value;renderRulePreview()};
  });
  $$('[data-remove-rule-metric]').forEach(button=>button.onclick=()=>{
    const removed=noCodeRuleState.metrics.splice(Number(button.dataset.removeRuleMetric),1)[0];
    if(noCodeRuleState.expression.startMetric===removed.id)noCodeRuleState.expression.startMetric=noCodeRuleState.metrics[0].id;
    noCodeRuleState.expression.operations=noCodeRuleState.expression.operations.filter(operation=>operation.metricId!==removed.id);
    renderNoCodeMetrics();renderFormulaBuilder();renderRulePreview();
  });
}
function renderFormulaBuilder(){
  const expression=noCodeRuleState.expression;
  $('#rule-formula').innerHTML=`<div class="formula-line"><select id="formula-start">${formulaMetricSelectOptions()}</select>${expression.operations.map((item,index)=>`<span class="formula-operation"><select data-formula-operator="${index}">${Object.entries(ruleArithmeticLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select><select data-formula-metric="${index}">${formulaMetricSelectOptions()}</select><button type="button" data-remove-formula-operation="${index}">×</button></span>`).join('')}<span class="formula-comparison"><select id="formula-comparator">${['EQ','NE','GT','GTE','LT','LTE','CONTAINS','NOT_CONTAINS'].map(value=>`<option value="${value}">${ruleOperatorLabels[value]}</option>`).join('')}</select><input id="formula-value" ${['CONTAINS','NOT_CONTAINS'].includes(expression.comparator)?'type="text"':'type="number" step="any"'} value="${esc(expression.value)}" placeholder="Comparison value"></span></div>`;
  $('#formula-start').value=expression.startMetric;$('#formula-comparator').value=expression.comparator;
  $('#formula-start').onchange=()=>{expression.startMetric=$('#formula-start').value;renderRulePreview()};
  $('#formula-comparator').onchange=()=>{expression.comparator=$('#formula-comparator').value;renderFormulaBuilder();renderRulePreview()};
  $('#formula-value').oninput=()=>{expression.value=$('#formula-value').value;renderRulePreview()};
  expression.operations.forEach((item,index)=>{const operator=$(`[data-formula-operator="${index}"]`),metric=$(`[data-formula-metric="${index}"]`);operator.value=item.operator;metric.value=item.metricId;operator.onchange=()=>{item.operator=operator.value;renderRulePreview()};metric.onchange=()=>{item.metricId=metric.value;renderRulePreview()}});
  $$('[data-remove-formula-operation]').forEach(button=>button.onclick=()=>{expression.operations.splice(Number(button.dataset.removeFormulaOperation),1);renderFormulaBuilder();renderRulePreview()});
}
function renderRulePreview(){
  if(!noCodeRuleState||!$('#rule-preview'))return;
  const filters=noCodeRuleState.filters.map((item,index)=>`${index?item.connector+' ':''}${filterColumns[item.field].label} ${ruleOperatorLabels[item.operator]} ${item.value||'…'}`).join(' '),metricIndexes=new Map(noCodeRuleState.metrics.map((item,index)=>[item.id,index])),expression=noCodeRuleState.expression;
  const formula=[metricLetter(metricIndexes.get(expression.startMetric)??0),...expression.operations.flatMap(item=>[ruleArithmeticSymbols[item.operator],metricLetter(metricIndexes.get(item.metricId)??0)]),ruleComparatorSymbols[expression.comparator],expression.value||'…'].join(' ');
  $('#rule-preview').innerHTML=`<span>HUMAN-READABLE PREVIEW</span>${filters?`<p>Include records where <strong>${esc(filters)}</strong>.</p>`:''}<p>${noCodeRuleState.metrics.map((item,index)=>`<strong>${esc(formulaMetricDescription(item,index))}</strong>`).join('<br>')}</p><p>Trigger when <strong>${esc(formula)}</strong>.</p><small>Each metric uses transaction_date. Empty, null and N/A grouping identities are excluded.</small>`;
}
function renderNoCodeBuilder(){
  $('#rule-channel').value=noCodeRuleState.channel;renderNoCodeConditions();renderNoCodeMetrics();renderFormulaBuilder();renderRulePreview();
}
function prepareNoCodeRuleBuilder(){
  const form=$('#rule-form');
  form.className='modal rule-builder-modal';
  form.innerHTML=`<header><div><p class="eyebrow">NO-CODE RULE BUILDER</p><h2>Create detection rule</h2><small>Build channel-specific behavioral rules without writing code.</small></div><button type="button" class="close" data-close-rule>×</button></header><div class="rule-builder-body"><section class="rule-basics"><label>Rule name<input id="rule-name" required maxlength="100" placeholder="e.g. Customer total flow in 24 hours"></label><label>Description<textarea id="rule-description" maxlength="400" placeholder="Explain why this behavior is risky"></textarea></label><div class="form-row"><label>Channel<select id="rule-channel"><option value="WALLET">Wallet</option><option value="POS">Virtual POS</option><option value="PHYSICAL_POS">Physical POS</option></select></label><label>Risk points<input id="rule-points" type="number" min="1" max="100" value="60" required></label></div></section><section class="builder-section"><div class="builder-section-head"><div><span>1</span><h3>Transaction conditions</h3><p>Optional filters applied to every metric.</p></div><button type="button" class="btn ghost small-btn" id="add-rule-filter">+ Add condition</button></div><div id="rule-filter-list" class="logic-list"></div></section><section class="builder-section"><div class="builder-section-head"><div><span>2</span><h3>Metrics</h3><p>Each aggregation has its own time window and grouping field.</p></div><button type="button" class="btn ghost small-btn" id="add-rule-metric">+ Add metric</button></div><div id="rule-metric-list" class="metric-builder-list"></div></section><section class="builder-section"><div class="builder-section-head"><div><span>3</span><h3>Formula</h3><p>Combine metrics with arithmetic and compare the result.</p></div><button type="button" class="btn ghost small-btn" id="add-formula-operation">+ Add operation</button></div><div id="rule-formula" class="formula-builder"></div></section><div class="rule-preview" id="rule-preview"></div></div><footer class="modal-actions"><button type="button" class="btn ghost" data-close-rule>Cancel</button><button class="btn primary">Create and activate rule</button></footer>`;
  resetNoCodeRule();renderNoCodeBuilder();
  $('#rule-channel').onchange=()=>{resetNoCodeRule($('#rule-channel').value);renderNoCodeBuilder()};
  $('#add-rule-filter').onclick=()=>{const first=ruleFields(noCodeRuleState.channel)[0];noCodeRuleState.filters.push(defaultRuleFilter(first));renderNoCodeConditions();renderRulePreview()};
  $('#add-rule-metric').onclick=()=>{const id=`metric_${Date.now()}_${noCodeRuleState.metrics.length+1}`;noCodeRuleState.metrics.push(defaultFormulaMetric(id));renderNoCodeMetrics();renderFormulaBuilder();renderRulePreview()};
  $('#add-formula-operation').onclick=()=>{noCodeRuleState.expression.operations.push({operator:'ADD',metricId:noCodeRuleState.metrics[Math.min(1,noCodeRuleState.metrics.length-1)].id});renderFormulaBuilder();renderRulePreview()};
  $$('[data-close-rule]').forEach(button=>button.onclick=()=>$('#rule-overlay').classList.add('hidden'));
  $('#new-rule').onclick=()=>{resetNoCodeRule(state.channel);$('#rule-name').value='';$('#rule-description').value='';$('#rule-points').value='60';renderNoCodeBuilder();$('#rule-overlay').classList.remove('hidden')};
  form.onsubmit=async event=>{
    event.preventDefault();
    if(noCodeRuleState.metrics.some(item=>item.metric!=='COUNT'&&!item.field)){toast('Complete every metric');return}
    if(noCodeRuleState.filters.some(item=>item.value==='')||noCodeRuleState.expression.value===''){toast('Complete every condition and formula value');return}
    const metrics=noCodeRuleState.metrics.map(item=>({...item,window:{value:Number(item.window.value),unit:item.window.unit},groupBy:item.groupBy||null}));
    const payload={name:$('#rule-name').value.trim(),description:$('#rule-description').value.trim(),channel:noCodeRuleState.channel,scoreContribution:Number($('#rule-points').value),active:true,definition:{timeField:'transactionDate',filters:noCodeRuleState.filters.map(item=>({...item,value:String(item.value)})),metrics,expression:{...noCodeRuleState.expression,value:String(noCodeRuleState.expression.value),operations:noCodeRuleState.expression.operations.map(item=>({...item}))}}};
    try{await request('/rules',{method:'POST',body:JSON.stringify(payload)});$('#rule-overlay').classList.add('hidden');toast('Formula rule created and evaluated');loadRules()}catch(error){toast(error.message)}
  };
}
function ruleDefinitionMarkup(ruleItem){
  if(!ruleItem.definition)return `<div class="condition"><span>IF</span><code>${esc(ruleItem.fieldName)} ${esc(ruleItem.operator)} ${esc(ruleItem.expectedValue)}</code></div>`;
  const definition=ruleItem.definition,scope=(definition.filters||[]).map((item,index)=>`${index?item.connector+' ':''}${filterColumns[item.field]?.label||item.field} ${ruleOperatorLabels[item.operator]||item.operator} ${item.value}`).join(' ');
  if(Array.isArray(definition.metrics)){
    const indexes=new Map(definition.metrics.map((item,index)=>[item.id,index])),expression=definition.expression,formula=[metricLetter(indexes.get(expression.startMetric)??0),...(expression.operations||[]).flatMap(item=>[ruleArithmeticSymbols[item.operator],metricLetter(indexes.get(item.metricId)??0)]),ruleComparatorSymbols[expression.comparator],expression.value].join(' ');
    const metrics=definition.metrics.map((item,index)=>`${metricLetter(index)}: ${ruleAggregateLabels[item.metric]}${item.field?`(${filterColumns[item.field]?.label||item.field})`:'(transactions)'} · ${item.window.value} ${item.window.unit.toLowerCase()} · ${item.groupBy?`by ${filterColumns[item.groupBy]?.label||item.groupBy}`:'all'}`).join(' | ');
    return `<div class="rule-definition">${scope?`<div class="rule-expression"><span>WHERE</span><code>${esc(scope)}</code></div>`:''}<div class="rule-expression"><span>METRICS</span><code>${esc(metrics)}</code></div><div class="rule-expression"><span>FORMULA</span><code>${esc(formula)}</code><small>transaction_date · N/A identities excluded</small></div></div>`;
  }
  const unit=definition.window.unit.toLowerCase(),aggregates=definition.aggregates.map((item,index)=>`${index?item.connector+' ':''}${ruleAggregateLabels[item.metric]}${item.field?`(${filterColumns[item.field]?.label||item.field})`:'(transactions)'} ${ruleOperatorLabels[item.operator]} ${item.value}`).join(' ');
  return `<div class="rule-definition"><div><span>WINDOW</span><strong>Last ${definition.window.value} ${unit}${Number(definition.window.value)===1?'':'s'}</strong><small>transaction_date</small></div><div><span>GROUP BY</span><strong>${definition.groupBy?esc(filterColumns[definition.groupBy]?.label||definition.groupBy):'All transactions'}</strong></div>${scope?`<div class="rule-expression"><span>WHERE</span><code>${esc(scope)}</code></div>`:''}<div class="rule-expression"><span>AGGREGATE</span><code>${esc(aggregates)}</code></div></div>`;
}

prepareNoCodeRuleBuilder();

// Personal wallet account profile.
function personalAccountButton(value){return `<button type="button" class="account-profile-link" data-personal-account="${esc(value)}">${esc(value)}</button>`}
function renderWalletCell(t,key){
  const attr=`data-column-key="${key}"`;
  if(key==='id')return `<td ${attr}><strong class="mono">${t.id.slice(0,8).toUpperCase()}</strong><small>${labels[t.channel]}</small></td>`;
  if(['createdAt','transactionDate','senderAccountCreatedDate','receiverAccountCreatedDate'].includes(key))return `<td ${attr}>${dateOrNA(t[key])}</td>`;
  if(key==='amount')return `<td ${attr} class="right amount">${money(t.amount,t.currency)}</td>`;
  if(key==='currency')return `<td ${attr} class="mono">${esc(t.currency)}</td>`;
  if(key==='riskScore')return `<td ${attr}>${risk(t.riskScore)}</td>`;
  if(key==='assignedAnalyst')return `<td ${attr}>${t.assignedAnalyst?`<span class="assigned-user">${esc(t.assignedAnalyst)}</span>`:'<span class="muted">Unassigned</span>'}</td>`;
  if(key==='reviewStatus')return `<td ${attr}><span class="${statusClass(t.reviewStatus)}">${labels[t.reviewStatus]}</span></td>`;
  if(key==='ruleSummary')return `<td ${attr}>${renderRuleSummary(t)}</td>`;
  if(['receiverKycLevel','senderKycLevel'].includes(key))return `<td ${attr}>${t[key]==null?'N/A':`<strong>${t[key]}</strong><small>/ 100</small>`}</td>`;
  if(['senderAge','receiverAge'].includes(key))return `<td ${attr}>${t[key]==null?'N/A':`${t[key]} years`}</td>`;
  if(['senderAccountNumber','receiverAccountNumber'].includes(key))return `<td ${attr} class="mono">${valueOrNA(t[key])==='N/A'?'N/A':personalAccountButton(t[key])}</td>`;
  if(['senderIban','receiverIban'].includes(key))return `<td ${attr} class="mono">${esc(valueOrNA(t[key]))}</td>`;
  return `<td ${attr}>${esc(valueOrNA(t[key]))}</td>`;
}
function renderWalletDetailInfo(t){
  const info=[
    ['Transaction ID',t.id],['Created at',dateOrNA(t.createdAt)],['Transaction date',dateOrNA(t.transactionDate)],
    ['Receiver account number',valueOrNA(t.receiverAccountNumber),'account'],['Sender account number',valueOrNA(t.senderAccountNumber),'account'],
    ['Sender IBAN',t.senderIban],['Receiver IBAN',t.receiverIban],['Amount',money(t.amount,t.currency)],['Currency',t.currency],
    ['Sender account holder name',t.senderAccountHolderName],['Receiver account holder name',t.receiverAccountHolderName],
    ['Sender account created date',dateOrNA(t.senderAccountCreatedDate)],['Receiver account created date',dateOrNA(t.receiverAccountCreatedDate)],
    ['Receiver KYC level',t.receiverKycLevel==null?'N/A':`${t.receiverKycLevel} / 100`],['Sender KYC level',t.senderKycLevel==null?'N/A':`${t.senderKycLevel} / 100`],
    ['Sender account email',valueOrNA(t.senderAccountEmail)],['Receiver account email',valueOrNA(t.receiverAccountEmail)],
    ['Sender age',valueOrNA(t.senderAge)],['Receiver age',valueOrNA(t.receiverAge)],['Rule',ruleSummary(t)],
    ['Score',`${t.riskScore} / 100`],['Assigned',t.assignedAnalyst||'Unassigned'],['Status',labels[t.reviewStatus]],['Description',t.description]
  ];
  $('#detail-info').innerHTML=info.map(([key,value,type])=>`<div><span>${key}</span><strong class="detail-value">${type==='account'&&value!=='N/A'?personalAccountButton(value):esc(value)}</strong></div>`).join('');
}
function walletStatusLabel(status){return status==='BLOCKED'?'Blocked — active, transactions disabled':status==='CLOSED'?'Closed':'Active'}
function personalBadge(value){return `<span class="badge ${String(value).toLowerCase()==='active'?'status-not-fraud':'status-on-hold'}">${esc(value)}</span>`}
function personalEmpty(columns,message){return `<tr><td class="empty-row" colspan="${columns}">${esc(message)}</td></tr>`}
function renderPersonalProfile(){
  const data=state.personalProfile,customer=data.customer;
  $('#personal-name').textContent=customer.fullName;$('#personal-number').textContent=customer.customerNumber;
  $('#personal-status').className=`personal-status ${customer.walletStatus.toLowerCase()}`;$('#personal-status').textContent=walletStatusLabel(customer.walletStatus);
  const balance=customer.wallets.reduce((sum,wallet)=>sum+Number(wallet.totalBalance||0),0);
  $('#personal-balance').textContent=money(balance,'TRY');$('#personal-monthly-volume').textContent=money(customer.monthlyTransactionVolume,'TRY');
  $('#personal-monthly-count').textContent=customer.monthlyTransactionCount;$('#personal-products').textContent=customer.wallets.length+customer.cards.length;
  const info=[['Customer no',customer.customerNumber],['Account created at',dateOrNA(customer.accountCreatedAt)],['Name surname',customer.fullName],['Country code',customer.countryCode],['E-mail',customer.email],['Phone number',customer.phoneNumber],['Address',customer.address],['Postal code',customer.postalCode],['City',customer.city],['Wallet status',walletStatusLabel(customer.walletStatus)],['Monthly income',money(customer.monthlyIncome,'TRY')],['Occupation',customer.occupation],['Monthly transaction volume',money(customer.monthlyTransactionVolume,'TRY')],['Monthly transaction count',customer.monthlyTransactionCount],['Income source',customer.incomeSource],['Birth date',dateOrNA(customer.birthDate)],['Mother name',customer.motherName],['Father name',customer.fatherName],['NVI code',customer.nviCode],['Identity number',customer.nationalId],['Contract date',dateOrNA(customer.contractDate)]];
  $('#personal-info-grid').innerHTML=info.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  $('#personal-status-history').innerHTML=customer.statusHistory.map(item=>`<div><strong>${esc(walletStatusLabel(item.status))}</strong><time>${dateOrNA(item.changedAt)}</time><span>${esc(item.actor)}</span><p>${esc(item.reason)}</p></div>`).join('');
  $('#personal-wallet-count').textContent=`${customer.wallets.length} wallet${customer.wallets.length===1?'':'s'}`;
  $('#personal-wallets-body').innerHTML=customer.wallets.length?customer.wallets.map(wallet=>`<tr><td class="mono">${esc(wallet.walletNumber)}</td><td class="mono">${esc(wallet.customerNumber)}</td><td>${esc(wallet.fullName)}</td><td class="mono">${esc(wallet.nationalId)}</td><td class="mono">${esc(wallet.fastIban)}</td><td class="amount">${money(wallet.totalBalance,wallet.currency)}</td><td>${personalBadge(wallet.status)}</td><td>${dateOrNA(wallet.createdAt)}</td></tr>`).join(''):personalEmpty(8,'No linked wallets');
  $('#personal-cards-body').innerHTML=customer.cards.length?customer.cards.map(card=>`<tr><td class="mono">${esc(card.maskedCardNumber)}</td><td>${esc(card.cardHolderName)}</td><td class="mono">${esc(card.walletNumber)}</td><td>${esc(card.cardType)}</td><td>${personalBadge(card.status)}</td><td>${dateOrNA(card.expireDate)}</td><td>${dateOrNA(card.createdAt)}</td><td>${dateOrNA(card.updatedAt)}</td></tr>`).join(''):personalEmpty(8,'No prepaid cards');
  $('#personal-devices-body').innerHTML=customer.devices.length?customer.devices.map(device=>`<tr><td class="mono">${esc(device.deviceId)}</td><td>${esc(device.brand)}</td><td>${esc(device.model)}</td><td>${esc(device.platform)}</td><td class="mono">${esc(device.ipAddress)}</td><td>${esc(device.browser)}</td><td>${dateOrNA(device.updatedAt)}</td><td>${dateOrNA(device.createdAt)}</td></tr>`).join(''):personalEmpty(8,'No registered devices');
  renderPersonalTransactions();
  $('#personal-activity-body').innerHTML=data.activities.length?data.activities.map(item=>`<tr><td>${dateOrNA(item.createdAt)}</td><td><span class="activity-type">${esc(item.type.replaceAll('_',' '))}</span></td><td>${esc(item.description)}</td><td>${esc(item.actor||'System')}</td><td class="mono">${esc(item.ipAddress||'N/A')}</td><td class="mono">${esc(item.deviceId||'N/A')}</td><td class="mono">${esc(item.transactionId?item.transactionId.slice(0,8).toUpperCase():'N/A')}</td></tr>`).join(''):personalEmpty(7,'No account activity');
}
function renderPersonalTransactions(){
  const rows=state.personalProfile.transactions;$('#personal-transaction-count').textContent=`${rows.length} transaction${rows.length===1?'':'s'}`;
  $('#personal-transactions-body').innerHTML=rows.length?rows.map(tx=>`<tr><td>${dateOrNA(tx.transactionDate)}</td><td><span class="direction ${tx.direction.toLowerCase()}">${esc(tx.direction)}</span></td><td>${esc(valueOrNA(tx.counterpartyName))}<small class="mono">${esc(valueOrNA(tx.counterpartyAccountNumber))}</small></td><td class="mono">${esc(valueOrNA(tx.counterpartyIban))}</td><td class="amount">${money(tx.amount,tx.currency)}</td><td>${esc(valueOrNA(tx.description))}</td><td>${tx.score} / 100</td><td><span class="${statusClass(tx.status)}">${labels[tx.status]}</span></td></tr>`).join(''):personalEmpty(8,'No transactions in this date range');
}
async function openPersonal(accountNumber,{push=true}={}){
  try{
    const query=new URLSearchParams();if($('#personal-from')?.value)query.set('from',$('#personal-from').value);if($('#personal-to')?.value)query.set('to',$('#personal-to').value);
    state.personalAccount=accountNumber;state.personalProfile=await request(`/personal/${encodeURIComponent(accountNumber)}${query.size?'?'+query:''}`);
    renderPersonalProfile();switchSection('personal',{route:false});
    if(push)history.pushState({accountNumber},'',`/Personal/${encodeURIComponent(accountNumber)}`);
  }catch(error){toast(error.message)}
}
function switchSection(section,{route=true}={}){
  state.section=section;$$('[id$="-section"]').forEach(item=>item.classList.add('hidden'));$(`#${section}-section`)?.classList.remove('hidden');
  $$('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.section===section));
  const titles={transactions:'Transaction Monitoring',rules:'Detection Rules',settings:'Workspace Settings',personal:'Personal Wallet Account'};
  $('#page-title').textContent=titles[section];$('#breadcrumb').textContent=section==='personal'?`WALLET / PERSONAL / ${state.personalAccount||''}`:`FRAUD OPERATIONS / ${section.toUpperCase()}`;
  if(section==='rules')loadRules();
  if(route&&section!=='personal'&&location.pathname!=='/')history.pushState({},'', '/');
}
async function init(){
  const route=location.pathname.match(/^\/Personal\/([^/]+)$/i);
  if(route){state.channel='WALLET';$$('[data-channel]').forEach(button=>button.classList.toggle('active',button.dataset.channel==='WALLET'))}
  await loadDefaultView(false);await Promise.all([loadTransactions(),loadRules()]);const generator=await request('/generator/status');state.running=generator.running;$('#generator-label').textContent=state.running?'RUNNING':'PAUSED';
  if(route)await openPersonal(decodeURIComponent(route[1]),{push:false});
  setInterval(()=>{if(state.running&&state.section==='transactions')loadTransactions()},3000);
}

document.addEventListener('click',event=>{const account=event.target.closest('[data-personal-account]');if(!account)return;event.preventDefault();event.stopPropagation();$('#detail-overlay')?.classList.add('hidden');openPersonal(account.dataset.personalAccount)},true);
$$('[data-personal-tab]').forEach(button=>button.onclick=()=>{$$('[data-personal-tab]').forEach(item=>item.classList.toggle('active',item===button));$$('[data-personal-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.personalPanel!==button.dataset.personalTab))});
$('#personal-back').onclick=()=>{switchSection('transactions');loadTransactions()};
$('#personal-date-form').onsubmit=event=>{event.preventDefault();openPersonal(state.personalAccount,{push:false})};
$('#personal-date-clear').onclick=()=>{$('#personal-from').value='';$('#personal-to').value='';openPersonal(state.personalAccount,{push:false})};
window.addEventListener('popstate',()=>{const route=location.pathname.match(/^\/Personal\/([^/]+)$/i);if(route)openPersonal(decodeURIComponent(route[1]),{push:false});else switchSection('transactions',{route:false})});
