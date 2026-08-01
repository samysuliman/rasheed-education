(() => {
  const state = { organizations: [], schools: [], branches: [] };
  const $ = id => document.getElementById(id);
  const statusName = s => ({active:"نشط",inactive:"غير نشط",archived:"مؤرشف"})[s] || s;
  const branchTypeName = s => ({main:"رئيسي",physical:"حضوري",online:"إلكتروني",hybrid:"مدمج"})[s] || s;
  const schoolTypeName = s => ({academy:"أكاديمية",private:"مدرسة أهلية",international:"مدرسة عالمية",quran_center:"مركز قرآن",training_center:"مركز تدريب",other:"أخرى"})[s] || s;

  async function request(path, options={}) {
    const response = await api(path, options);
    if(!response.ok) {
      const detail = await response.text().catch(()=>"");
      const error = new Error(detail || `HTTP_${response.status}`);
      error.status = response.status;
      throw error;
    }
    if(response.status === 204) return null;
    return response.json();
  }

  function organizationName(id){ return state.organizations.find(x=>String(x.id)===String(id))?.name_ar || "—"; }
  function schoolName(id){ return state.schools.find(x=>String(x.id)===String(id))?.name_ar || "—"; }

  function render(){
    $("orgCount").textContent = state.organizations.length;
    $("schoolCount").textContent = state.schools.length;
    $("branchCount").textContent = state.branches.length;
    $("organizationsList").innerHTML = state.organizations.length ? state.organizations.map(x=>`<div class="entity-row"><div><strong>${esc(x.name_ar)}</strong><div class="entity-meta">${esc(x.name_en||"")} · الرمز: ${esc(x.code)}</div></div><span class="status-pill">${esc(statusName(x.status))}</span></div>`).join("") : '<div class="empty-state">لا توجد مؤسسات.</div>';
    $("schoolsList").innerHTML = state.schools.length ? state.schools.map(x=>`<div class="entity-row"><div><strong>${esc(x.name_ar)}</strong><div class="entity-meta">${esc(organizationName(x.organization_id))} · ${esc(schoolTypeName(x.school_type))} · الرمز: ${esc(x.code)}</div></div><span class="status-pill">${esc(statusName(x.status))}</span></div>`).join("") : '<div class="empty-state">لا توجد مدارس.</div>';
    $("branchesList").innerHTML = state.branches.length ? state.branches.map(x=>`<div class="entity-row"><div><strong>${esc(x.name_ar)}</strong><div class="entity-meta">${esc(schoolName(x.school_id))} · ${esc(branchTypeName(x.branch_type))}${x.city?` · ${esc(x.city)}`:""}${x.is_main?" · الفرع الرئيسي":""}</div></div><span class="status-pill">${esc(statusName(x.status))}</span></div>`).join("") : '<div class="empty-state">لا توجد فروع.</div>';
  }

  async function load(){
    const ok = await requireAdmin(); if(!ok) return;
    try{
      const [organizations, schools, branches] = await Promise.all([
        request('/rest/v1/education_organizations?select=*&order=created_at.asc'),
        request('/rest/v1/education_schools?select=*&order=created_at.asc'),
        request('/rest/v1/education_branches?select=*&order=created_at.asc')
      ]);
      state.organizations = organizations; state.schools = schools; state.branches = branches;
      render();
    }catch(error){
      console.error('Foundation load error:', error);
      if(error.status === 404 || String(error.message).includes('PGRST205')) $("setupNotice").classList.remove("hide");
      else $("loadError").classList.remove("hide");
      ["organizationsList","schoolsList","branchesList"].forEach(id=>$(id).innerHTML='<div class="empty-state">تعذر التحميل.</div>');
    }
  }

  function input(name,label,required=true,type="text",value="") { return `<div><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" ${required?"required":""} value="${esc(value)}"></div>`; }
  function select(name,label,options){ return `<div><label for="${name}">${label}</label><select id="${name}" name="${name}" required>${options.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join("")}</select></div>`; }

  function openDialog(type){
    $("entityType").value = type; $("formError").classList.add("hide");
    if(type === "organization"){
      $("dialogTitle").textContent = "إضافة مؤسسة";
      $("dynamicFields").innerHTML = input("code","الرمز المختصر")+input("name_ar","الاسم العربي")+input("name_en","الاسم الإنجليزي",false)+input("email","البريد الإلكتروني",false,"email")+input("phone","رقم الهاتف",false)+select("status","الحالة",[["active","نشط"],["inactive","غير نشط"]]);
    } else if(type === "school"){
      $("dialogTitle").textContent = "إضافة مدرسة أو أكاديمية";
      $("dynamicFields").innerHTML = select("organization_id","المؤسسة",state.organizations.map(x=>[x.id,x.name_ar]))+input("code","الرمز المختصر")+input("name_ar","الاسم العربي")+input("name_en","الاسم الإنجليزي",false)+select("school_type","نوع الجهة",[["academy","أكاديمية"],["private","مدرسة أهلية"],["international","مدرسة عالمية"],["quran_center","مركز قرآن"],["training_center","مركز تدريب"],["other","أخرى"]])+select("gender_scope","النطاق",[["mixed","مختلط"],["boys","بنين"],["girls","بنات"]]);
    } else {
      $("dialogTitle").textContent = "إضافة فرع";
      $("dynamicFields").innerHTML = select("school_id","المدرسة",state.schools.map(x=>[x.id,x.name_ar]))+input("code","الرمز المختصر")+input("name_ar","الاسم العربي")+input("name_en","الاسم الإنجليزي",false)+select("branch_type","نوع الفرع",[["main","رئيسي"],["physical","حضوري"],["online","إلكتروني"],["hybrid","مدمج"]])+input("city","المدينة",false)+`<div><label><input name="is_main" type="checkbox"> تعيينه فرعًا رئيسيًا</label></div>`;
    }
    $("entityDialog").showModal();
  }

  async function save(event){
    event.preventDefault();
    const form = event.currentTarget; const type = $("entityType").value; const data = Object.fromEntries(new FormData(form));
    delete data.entityType; if(type === "branch") data.is_main = form.elements.is_main.checked;
    const table = type === "organization" ? "education_organizations" : type === "school" ? "education_schools" : "education_branches";
    const button = $("saveEntity"); button.disabled = true; button.textContent = "جارٍ الحفظ...";
    try{
      await request(`/rest/v1/${table}`,{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(data)});
      $("entityDialog").close(); form.reset(); await load();
    }catch(error){
      console.error('Foundation save error:', error); $("formError").textContent = "تعذر الحفظ. تحقق من عدم تكرار الرمز ومن اكتمال الحقول."; $("formError").classList.remove("hide");
    }finally{ button.disabled=false; button.textContent="حفظ"; }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    if(document.body.dataset.adminPage !== "organization") return;
    document.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>openDialog(btn.dataset.open)));
    $("cancelDialog").addEventListener("click",()=>$("entityDialog").close());
    $("entityForm").addEventListener("submit",save);
    document.addEventListener('click',e=>{const a=e.target.closest('[data-demo-alert]');if(a){e.preventDefault();alert('هذه الوحدة ضمن مرحلة لاحقة.');}});
    load();
  });
})();
