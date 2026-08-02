(()=>{
 const state={people:[],accounts:[],users:[],audit:[]}; const $=id=>document.getElementById(id); let currentPersonId=null;
 async function req(path,opt={}){const r=await api(path,opt);if(!r.ok){const t=await r.text();const e=new Error(t||`HTTP ${r.status}`);e.status=r.status;throw e;}if(r.status===204)return null;const t=await r.text();return t?JSON.parse(t):null;}
 const accountFor=id=>state.accounts.find(a=>a.person_id===id); const escv=v=>esc(v??'');
 function statusLabel(s){return ({active:'نشط',inactive:'غير نشط',archived:'مؤرشف',pending:'بانتظار التفعيل',suspended:'موقوف',locked:'مقفل',closed:'مغلق'})[s]||s||'—';}
 function actionLabel(a){return ({account_created:'إنشاء حساب',account_updated:'تعديل حساب',password_reset:'إعادة تعيين كلمة المرور',account_linked:'ربط حساب دخول',account_unlinked:'إلغاء ربط حساب'})[a]||a;}
 function userFor(id){return state.users.find(u=>u.id===id);} function userEmail(id){return userFor(id)?.email||'غير مرتبط';}
 function initials(p){return (p.full_name_ar||p.full_name_en||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('');}
 function avatar(p){return p.photo_url?`<span class="avatar"><img src="${escv(p.photo_url)}" alt=""></span>`:`<span class="avatar">${escv(initials(p))}</span>`;}
 function slugify(v){return (v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,40);}
 function suggestedUsername(p,mode){if(mode==='person_code')return (p.person_code||'').toLowerCase();if(mode==='email')return (p.email||'').toLowerCase();if(mode==='auto'){const base=slugify(p.full_name_en);return base||((p.person_code||'').toLowerCase());}return '';}
 function lastSignIn(a){const u=a?.auth_user_id?userFor(a.auth_user_id):null;return u?.last_sign_in_at?fmtDate(u.last_sign_in_at):'لم يسجل الدخول بعد';}
 function render(){const q=($('peopleSearch')?.value||'').trim().toLowerCase();const rows=state.people.filter(p=>{const a=accountFor(p.id);return [p.person_code,p.full_name_ar,p.full_name_en,p.national_id,p.mobile,p.email,a?.username].join(' ').toLowerCase().includes(q)});
  $('peopleList').innerHTML=rows.length?rows.map(p=>{const a=accountFor(p.id);return `<article class="person-card"><div class="person-head"><div class="person-main">${avatar(p)}<div><h3 class="person-name">${escv(p.full_name_ar)}</h3><div class="person-code">${escv(p.person_code||'—')}</div><div class="meta">${escv(p.full_name_en||'')}<br>الجنسية: ${escv(p.nationality||'—')} · الهوية: ${escv(p.national_id||'—')}<br>الجوال: ${escv(p.mobile||'—')} · البريد: ${escv(p.email||'—')}</div></div></div><span class="badge ${escv(p.status)}">${escv(statusLabel(p.status))}</span></div><div class="account-summary">${a?`<div class="badges"><span class="badge ${escv(a.account_status)}">الحساب: ${escv(statusLabel(a.account_status))}</span>${a.username?`<span class="badge">@${escv(a.username)}</span>`:''}</div><div class="meta">آخر دخول: ${escv(lastSignIn(a))}</div>`:`<div class="empty-account">لا يوجد حساب دخول</div>`}</div><div class="actions" style="margin-top:12px"><button class="btn btn-secondary" data-edit-person="${p.id}">تعديل البطاقة</button><button class="btn btn-primary" data-account-person="${p.id}">${a?'إدارة الحساب':'إنشاء حساب'}</button></div></article>`}).join(''):'<div class="empty">لا توجد نتائج.</div>';
  const withAccounts=state.people.filter(p=>accountFor(p.id));$('accountsList').innerHTML=withAccounts.length?withAccounts.map(p=>{const a=accountFor(p.id),u=a?.auth_user_id?userFor(a.auth_user_id):null;return `<article class="person-card"><div class="person-main">${avatar(p)}<div><h3 class="person-name">${escv(p.full_name_ar)}</h3><div class="person-code">${escv(p.person_code||'—')}</div></div></div><div class="meta" style="margin-top:10px">اسم المستخدم: ${escv(a?.username||'—')}<br>البريد المرتبط: ${escv(a?.auth_user_id?userEmail(a.auth_user_id):'—')}<br>آخر دخول: ${escv(u?.last_sign_in_at?fmtDate(u.last_sign_in_at):'لم يسجل الدخول بعد')}<br>آخر إعادة تعيين: ${escv(a?.last_password_reset_at?fmtDate(a.last_password_reset_at):'—')}</div><div class="badges"><span class="badge ${escv(a?.account_status)}">${escv(statusLabel(a?.account_status))}</span></div><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-account-person="${p.id}">إدارة الحساب</button></div></article>`}).join(''):'<div class="empty">لا توجد حسابات منشأة بعد.</div>';
  $('auditList').innerHTML=state.audit.length?state.audit.map(x=>`<div class="audit-row"><strong>${escv(actionLabel(x.action))}</strong><div class="meta">${escv(fmtDate(x.created_at))} · ${escv(state.people.find(p=>p.id===x.person_id)?.full_name_ar||'شخص غير معروف')}</div></div>`).join(''):'<div class="empty">لا توجد عمليات مسجلة بعد.</div>';
 }
 function fillUsers(){$('authUserSelect').innerHTML='<option value="">— بدون حساب حاليًا —</option>'+state.users.map(u=>`<option value="${u.id}">${escv(u.email||u.id)}</option>`).join('');}
 async function load(){if(!await requireAdmin())return;try{const [people,accounts,users,audit]=await Promise.all([req('/rest/v1/people?select=*&order=created_at.desc'),req('/rest/v1/person_accounts?select=*&order=created_at.desc'),req('/rest/v1/rpc/list_identity_users',{method:'POST',body:'{}'}),req('/rest/v1/account_audit_log?select=*&order=created_at.desc&limit=100')]);Object.assign(state,{people,accounts,users,audit});fillUsers();render();}catch(e){console.error(e);if(e.status===404||String(e.message).includes('PGRST'))$('setupNotice').classList.remove('hide');else{$('loadError').textContent='تعذر تحميل الأشخاص والحسابات.';$('loadError').classList.remove('hide');}}}
 function openPerson(id){const f=$('personForm');f.reset();$('personError').classList.add('hide');const p=state.people.find(x=>x.id===id);$('personDialogTitle').textContent=p?'تعديل بطاقة الشخص':'إضافة شخص';if(p)Object.keys(p).forEach(k=>{if(f.elements[k]&&p[k]!=null)f.elements[k].value=p[k]});$('personDialog').showModal();}
 async function savePerson(e){e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f)),id=d.id;delete d.id;['full_name_en','national_id','nationality','birth_date','mobile','whatsapp','email','photo_url','address','notes'].forEach(k=>{if(!d[k])d[k]=null});try{if(id)await req(`/rest/v1/people?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...d,updated_at:new Date().toISOString()})});else await req('/rest/v1/people',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(d)});$('personDialog').close();await load();}catch(err){console.error(err);$('personError').textContent='تعذر الحفظ. تحقق من عدم تكرار رقم الهوية.';$('personError').classList.remove('hide');}}
 function applyUsernameMode(){const p=state.people.find(x=>x.id===currentPersonId),mode=$('usernameMode').value;if(!p||mode==='manual')return;const v=suggestedUsername(p,mode);if(v)$('accountForm').elements.username.value=v;}
 function openAccount(personId){currentPersonId=personId;const f=$('accountForm');f.reset();f.elements.person_id.value=personId;const a=accountFor(personId);$('usernameMode').value=a?.username?'manual':'auto';if(a){f.elements.username.value=a.username||'';f.elements.auth_user_id.value=a.auth_user_id||'';f.elements.account_status.value=a.account_status;f.elements.must_change_password.value=String(a.must_change_password);}else{f.elements.account_status.value='pending';f.elements.must_change_password.value='true';applyUsernameMode();}$('accountError').classList.add('hide');$('accountDialog').showModal();}
 function generatePassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';let out='';crypto.getRandomValues(new Uint32Array(14)).forEach(n=>out+=chars[n%chars.length]);$('newPassword').value=out;}
 function showMessage(message,type='success'){
  let box=document.getElementById('peopleToast');
  if(!box){box=document.createElement('div');box.id='peopleToast';box.style.cssText='position:fixed;left:24px;bottom:24px;z-index:99999;padding:12px 18px;border-radius:12px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:.2s;max-width:340px';document.body.appendChild(box);}
  box.textContent=message;box.style.background=type==='error'?'#b42318':'#08765f';box.style.color='#fff';box.style.opacity='1';box.style.transform='translateY(0)';
  clearTimeout(box._timer);box._timer=setTimeout(()=>{box.style.opacity='0';box.style.transform='translateY(8px)';},2200);
 }
 async function copyPassword(){
  const input=$('newPassword'),v=input.value.trim();
  if(!v){showMessage('أنشئ كلمة مرور أولًا.','error');return;}
  let copied=false;
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(v);copied=true;}}catch(e){console.warn('Clipboard API failed',e);}
  if(!copied){try{input.focus();input.select();input.setSelectionRange(0,input.value.length);copied=document.execCommand('copy');}catch(e){console.warn('Fallback copy failed',e);}}
  showMessage(copied?'تم نسخ كلمة المرور.':'تعذر النسخ تلقائيًا؛ حدّد كلمة المرور وانسخها يدويًا.',copied?'success':'error');
 }
 async function saveAccount(e){
  e.preventDefault();
  const f=e.currentTarget,submit=f.querySelector('button[type="submit"]');
  const d=Object.fromEntries(new FormData(f)),newPassword=(d.new_password||'').trim();delete d.new_password;
  d.auth_user_id=d.auth_user_id||null;d.username=d.username?.trim().toLowerCase()||null;d.must_change_password=d.must_change_password==='true';
  $('accountError').classList.add('hide');
  if(!d.username){$('accountError').textContent='اكتب اسم المستخدم أو أنشئه تلقائيًا.';$('accountError').classList.remove('hide');return;}
  if(!/^[a-z0-9._@-]+$/.test(d.username)){$('accountError').textContent='اسم المستخدم يجب أن يكون بالإنجليزية، ويمكن أن يحتوي على أرقام ونقطة وشرطة فقط.';$('accountError').classList.remove('hide');return;}
  if(newPassword&&newPassword.length<8){$('accountError').textContent='كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف.';$('accountError').classList.remove('hide');return;}
  const old=accountFor(d.person_id),originalText=submit.textContent;submit.disabled=true;submit.textContent='جاري الحفظ...';
  try{
    if(old)await req(`/rest/v1/person_accounts?id=eq.${encodeURIComponent(old.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...d,updated_at:new Date().toISOString()})});
    else await req('/rest/v1/person_accounts',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(d)});
    let passwordApplied=false;
    if(newPassword&&d.auth_user_id){await req('/rest/v1/rpc/reset_person_password',{method:'POST',body:JSON.stringify({p_person_id:d.person_id,p_new_password:newPassword})});passwordApplied=true;}
    $('accountDialog').close();
    await load();
    showMessage(newPassword&&!passwordApplied?'تم حفظ الحساب. اربطه بحساب دخول لتطبيق كلمة المرور المؤقتة.':'تم حفظ الحساب بنجاح.');
  }catch(err){
    console.error(err);
    let msg='تعذر حفظ الحساب.';
    const raw=String(err.message||'');
    if(raw.includes('duplicate')||raw.includes('unique'))msg='اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.';
    else if(raw.includes('no linked auth user'))msg='تم حفظ بيانات الحساب، لكن يجب ربطه بحساب دخول قبل تغيير كلمة المرور.';
    $('accountError').textContent=msg;$('accountError').classList.remove('hide');
  }finally{submit.disabled=false;submit.textContent=originalText;}
 }
 document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')}));$('addPersonBtn').addEventListener('click',()=>openPerson());$('peopleSearch').addEventListener('input',render);$('personForm').addEventListener('submit',savePerson);$('accountForm').addEventListener('submit',saveAccount);$('usernameMode').addEventListener('change',applyUsernameMode);$('generatePasswordBtn').addEventListener('click',generatePassword);$('copyPasswordBtn').addEventListener('click',copyPassword);document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));document.addEventListener('click',e=>{const ep=e.target.closest('[data-edit-person]');if(ep)openPerson(ep.dataset.editPerson);const ac=e.target.closest('[data-account-person]');if(ac)openAccount(ac.dataset.accountPerson)});load();});
})();
