(() => {
const URL="https://pjrturqykjvplyrbvjte.supabase.co";
const KEY="sb_publishable_-M4jYj9CgTglX-IPOCfT-w_tedDSZFF";
const db=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id);
let enquiries=[],selected=null,adminUser=null,featurePackages=[],featureRows=[];
const statuses=[["new","New"],["contacted","Contacted"],["quotation_sent","Quotation Sent"],["confirmed","Confirmed"],["in_progress","In Progress"],["completed","Completed"],["cancelled","Cancelled"]];
const safe=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function showLogin(message=""){ $("login-view").hidden=false;$("dashboard-view").hidden=true;if(message){$("login-feedback").textContent=message;$("login-feedback").className="feedback error";}}
function showDashboard(){ $("login-view").hidden=true;$("dashboard-view").hidden=false;$("admin-email").textContent=adminUser.email||"";loadEnquiries();loadSettings();}
async function verifySession(){
 const {data:{session}}=await db.auth.getSession();if(!session){showLogin();return;}
 const role=String(session.user.app_metadata?.role||"");
 if(role!=="admin"){await db.auth.signOut();showLogin("This account does not have administrator access. Please contact the site owner.");return;}
 adminUser=session.user;showDashboard();
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const b=e.currentTarget.querySelector("button");b.disabled=true;b.textContent="Signing in…";const {data,error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});b.disabled=false;b.textContent="Sign in to dashboard";if(error){showLogin("Sign-in failed. Check your email and password.");return;}adminUser=data.user;if(String(data.user.app_metadata?.role||"")!=="admin"){await db.auth.signOut();showLogin("Signed in, but this account is not assigned the admin role.");return;}showDashboard();});
$("logout-button").addEventListener("click",async()=>{await db.auth.signOut();adminUser=null;showLogin();});
document.querySelectorAll(".side-link").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".side-link").forEach(x=>x.classList.toggle("active",x===btn));const view=btn.dataset.view;$("enquiries-view").hidden=view!=="enquiries";$("pricing-view").hidden=view!=="pricing";$("settings-view").hidden=view!=="settings";$("features-view").hidden=view!=="features";$("page-title").textContent=view==="settings"?"Contact Settings":view==="pricing"?"Pricing Management":view==="features"?"Package Features":"Project Enquiries";if(view==="pricing")loadPricingPackages();if(view==="features")loadFeaturePackages();}));
async function loadEnquiries(){
 $("enquiry-list").innerHTML='<p class="empty">Loading enquiries…</p>';
 const {data,error}=await db.from("project_enquiries").select("*").order("created_at",{ascending:false});
 if(error){$("enquiry-list").innerHTML='<p class="empty">Could not load enquiries. Please refresh or check admin permissions.</p>';return;}
 enquiries=data||[];refreshFeatureLeadOptions();renderFollowUps();$("total-count").textContent=enquiries.length;$("new-count").textContent=enquiries.filter(x=>x.status==="new").length;$("progress-count").textContent=enquiries.filter(x=>x.status==="in_progress").length;$("closed-count").textContent=enquiries.filter(x=>["completed","cancelled"].includes(x.status)).length;$("nav-count").textContent=enquiries.filter(x=>x.status==="new").length;renderEnquiries();
}

function renderFollowUps(){
 const now=Date.now();
 const pending=enquiries.filter(x=>x.follow_up_at && !["completed","cancelled"].includes(x.status)).sort((a,b)=>new Date(a.follow_up_at)-new Date(b.follow_up_at));
 $("followup-count").textContent=pending.filter(x=>new Date(x.follow_up_at).getTime()<=now).length;
 const host=$("followup-list");
 if(!pending.length){host.innerHTML='<p class="empty">No follow-ups scheduled. Open a lead to schedule one.</p>';return;}
 host.innerHTML=pending.map(x=>{const due=new Date(x.follow_up_at),overdue=due.getTime()<now;return '<article class="followup-row"><div><strong>'+safe(x.customer_name)+'</strong><p>'+safe(x.project_type)+' · <span class="priority-'+safe(x.lead_priority||"medium")+'">'+safe((x.lead_priority||"medium").toUpperCase())+' PRIORITY</span></p><small>'+(overdue?'Overdue · ':'Due · ')+safe(due.toLocaleString())+'</small></div><button class="tiny-btn" data-followup-detail="'+x.id+'">Open Lead</button></article>';}).join("");
 host.querySelectorAll("[data-followup-detail]").forEach(b=>b.addEventListener("click",()=>openDetails(b.dataset.followupDetail)));
}

function renderEnquiries(){
 const term=$("enquiry-search").value.toLowerCase(),filter=$("status-filter").value;
 const rows=enquiries.filter(x=>(!filter||x.status===filter)&&[x.customer_name,x.email,x.phone,x.project_type,x.business_name,x.package_name,x.package_country_code].some(v=>String(v||"").toLowerCase().includes(term)));
 if(!rows.length){$("enquiry-list").innerHTML='<p class="empty">No enquiries match this view.</p>';return;}
 $("enquiry-list").innerHTML=rows.map(x=>{const label=statuses.find(s=>s[0]===x.status)?.[1]||x.status;return '<article class="enquiry-card"><div><h3>'+safe(x.customer_name)+' <span class="status-tag">'+safe(label)+'</span></h3><p>'+safe(x.project_type)+' · '+safe(x.estimated_budget||"Budget not specified")+'</p>'+ (x.package_name?'<p><strong>Package:</strong> '+safe(x.package_name)+' · '+safe(x.package_country_code||"")+' · '+safe(x.package_currency||"")+(x.package_price!==null&&x.package_price!==undefined?' '+Number(x.package_price).toLocaleString():' Custom quote')+'</p>':'')+'<p>'+safe(x.email||"No email")+' · '+safe(x.phone)+' · '+new Date(x.created_at).toLocaleString()+'</p></div><div class="card-actions"><select aria-label="Update status" data-status="'+x.id+'">'+statuses.map(s=>'<option value="'+s[0]+'" '+(s[0]===x.status?"selected":"")+'>'+s[1]+'</option>').join("")+'</select><button class="tiny-btn" data-details="'+x.id+'">View details</button><a class="tiny-btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/'+String(x.phone||"").replace(/\D/g,"")+'">WhatsApp</a><a class="tiny-btn" href="tel:'+safe(x.phone)+'">Call</a></div></article>';}).join("");
 document.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("change",()=>updateStatus(el.dataset.status,el.value)));
 document.querySelectorAll("[data-details]").forEach(el=>el.addEventListener("click",()=>openDetails(el.dataset.details)));
}
async function updateStatus(id,status){const {error}=await db.from("project_enquiries").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error){alert("Status could not be updated. Check admin permissions.");return;}const item=enquiries.find(x=>x.id===id);if(item)item.status=status;loadEnquiries();}

async function loadCommunicationHistory(id){
 const host=$("communication-history");host.innerHTML='<p class="empty">Loading history…</p>';
 const {data,error}=await db.from("enquiry_communications").select("*").eq("enquiry_id",id).order("created_at",{ascending:false});
 if(error){host.innerHTML='<p class="empty">Could not load communication history.</p>';return;}
 if(!data?.length){host.innerHTML='<p class="empty">No communication recorded yet.</p>';return;}
 host.innerHTML=data.map(row=>'<article class="communication-item"><div><b>'+safe((row.channel||"note").replace("_"," ").toUpperCase())+'</b><small>'+safe(new Date(row.created_at).toLocaleString())+'</small></div><p>'+safe(row.message)+'</p></article>').join("");
}
$("save-follow-up").addEventListener("click",async()=>{
 if(!selected)return;const raw=$("follow-up-at").value;
 const follow_up_at=raw?new Date(raw).toISOString():null,lead_priority=$("lead-priority").value;
 const {error}=await db.from("project_enquiries").update({follow_up_at,lead_priority,follow_up_notified_at:null,updated_at:new Date().toISOString()}).eq("id",selected.id);
 if(error){alert("Follow-up could not be saved. Check admin permissions.");return;}
 selected.follow_up_at=follow_up_at;selected.lead_priority=lead_priority;await loadEnquiries();alert("Follow-up details saved.");
});
$("add-communication").addEventListener("click",async()=>{
 if(!selected)return;const message=$("communication-message").value.trim();
 if(!message){alert("Enter a communication note first.");return;}
 const {error}=await db.from("enquiry_communications").insert({enquiry_id:selected.id,channel:$("communication-channel").value,message,created_by:adminUser.id});
 if(error){alert("Could not add communication history.");return;}
 $("communication-message").value="";await loadCommunicationHistory(selected.id);
});


async function sendPackageBreakdown(){
 if(!featurePackages.length)await loadFeaturePackages();
 if(!selected?.email){alert("This lead does not have a valid email address.");return;}
 const names=featurePackages.map((p,i)=>(i+1)+". "+p.name).join("\n");
 let pkg=featurePackages.find(p=>p.name===selected.package_name);
 if(!pkg){const choice=prompt("Choose package number to send:\n"+names,"1");if(!choice)return;pkg=featurePackages[Number(choice)-1];}
 if(!pkg){alert("Please select a valid package.");return;}
 let country=String(selected.package_country_code||"IN").toUpperCase();if(!["IN","US","CA","GB"].includes(country))country="IN";
 const chosen=prompt("Select the client's price market: IN (India), US (USA), CA (Canada), GB (UK)",country);
 if(!chosen)return;country=chosen.trim().toUpperCase();if(!["IN","US","CA","GB"].includes(country)){alert("Enter IN, US, CA or GB.");return;}
 const btn=$("send-package-breakdown");btn.disabled=true;btn.textContent="Sending…";
 const {data,error}=await db.functions.invoke("send-package-breakdown",{body:{enquiry_id:selected.id,package_id:pkg.id,country_code:country,recipient_email:selected.email,recipient_name:selected.customer_name}});
 btn.disabled=false;btn.textContent="Email Package Details";
 if(error){alert("Could not send package details. "+(error.message||"Check the email function and try again."));return;}
 await db.from("enquiry_communications").insert({enquiry_id:selected.id,channel:"email",message:"Package feature breakdown emailed to "+selected.email+" for "+pkg.name+" ("+country+").",created_by:adminUser.id});
 await loadCommunicationHistory(selected.id);alert("Package feature breakdown sent to "+selected.email+".");
}

function openDetails(id){selected=enquiries.find(x=>x.id===id);if(!selected)return;$("detail-name").textContent=selected.customer_name;$("admin-notes").value=selected.admin_notes||"";const fields=[["Business",selected.business_name],["Email",selected.email],["Phone",selected.phone],["Service",selected.project_type],["Budget",selected.estimated_budget],["Selected Package",selected.package_name],["Package Country",selected.package_country_code],["Package Currency",selected.package_currency],["Package Price",selected.package_price!==null&&selected.package_price!==undefined?Number(selected.package_price).toLocaleString():""],["Submitted",new Date(selected.created_at).toLocaleString()],["Project Details",selected.description],["Required Features",selected.required_features],["Expected Timeline",selected.expected_timeline]];$("detail-content").innerHTML=fields.filter(f=>f[1]).map(f=>'<div><b>'+safe(f[0])+'</b>'+safe(f[1])+'</div>').join("");$("follow-up-at").value=selected.follow_up_at?new Date(new Date(selected.follow_up_at).getTime()-new Date(selected.follow_up_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";$("lead-priority").value=selected.lead_priority||"medium";loadCommunicationHistory(selected.id);$("detail-whatsapp").onclick=()=>window.open("https://wa.me/"+String(selected.phone||"").replace(/\D/g,""),"_blank","noopener");$("send-package-breakdown").onclick=sendPackageBreakdown;$("detail-modal").hidden=false;}
$("modal-close").addEventListener("click",()=>$("detail-modal").hidden=true);
$("detail-modal").addEventListener("click",e=>{if(e.target===$("detail-modal"))$("detail-modal").hidden=true;});
$("save-notes").addEventListener("click",async()=>{if(!selected)return;const {error}=await db.from("project_enquiries").update({admin_notes:$("admin-notes").value,updated_at:new Date().toISOString()}).eq("id",selected.id);if(error){alert("Notes could not be saved.");return;}selected.admin_notes=$("admin-notes").value;alert("Admin notes saved.");});
$("refresh-enquiries").addEventListener("click",loadEnquiries);$("enquiry-search").addEventListener("input",renderEnquiries);$("status-filter").addEventListener("change",renderEnquiries);
async function loadSettings(){const {data,error}=await db.from("site_settings").select("contact_settings").eq("id","contact").maybeSingle();if(error||!data)return;const s=data.contact_settings||{},form=$("settings-form");["business_email","contact_number","whatsapp_number","location","service_availability","business_hours"].forEach(k=>form.elements[k].value=s[k]||"");["instagram","linkedin","facebook","youtube"].forEach(k=>form.elements[k].value=s.social_links?.[k]||"");form.elements.budget_ranges.value=Array.isArray(s.budget_ranges)?s.budget_ranges.join("\n"):"";}
$("settings-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form),feedback=$("settings-feedback"),button=form.querySelector("button[type=submit]");const cleanUrl=v=>{v=String(v||"").trim();if(!v)return "";try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}};const settings={business_email:String(fd.get("business_email")||"").trim(),contact_number:String(fd.get("contact_number")||"").trim(),whatsapp_number:String(fd.get("whatsapp_number")||"").trim(),location:String(fd.get("location")||"").trim(),service_availability:String(fd.get("service_availability")||"").trim(),business_hours:String(fd.get("business_hours")||"").trim(),social_links:{instagram:cleanUrl(fd.get("instagram")),linkedin:cleanUrl(fd.get("linkedin")),facebook:cleanUrl(fd.get("facebook")),youtube:cleanUrl(fd.get("youtube"))},budget_ranges:String(fd.get("budget_ranges")||"").split("\n").map(x=>x.trim()).filter(Boolean).slice(0,20)};button.disabled=true;button.textContent="Saving…";const {error}=await db.from("site_settings").update({contact_settings:settings,updated_at:new Date().toISOString(),updated_by:adminUser.id}).eq("id","contact");button.disabled=false;button.textContent="Save Contact Settings";feedback.textContent=error?"Could not save settings. Verify admin access and try again.":"Contact settings saved successfully. The public website will load the latest details.";feedback.className=error?"feedback error":"feedback";});
db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){adminUser=null;showLogin();}});
verifySession();
/* International pricing package management */
const marketConfig={
 IN:{country_name:"India",currency:"INR"},
 US:{country_name:"United States",currency:"USD"},
 CA:{country_name:"Canada",currency:"CAD"},
 GB:{country_name:"United Kingdom",currency:"GBP"}
};


// Client input requirement templates and per-lead tracking
const inputStatusLabels={pending:"Pending",requested:"Requested",received:"Received",not_required:"Not Required"};
async function loadInputRequirementTemplates(){
 const packageId=$("feature-package-select").value,host=$("input-requirement-template-list");
 if(!packageId){host.innerHTML='<p class="empty">Select a package to manage its input checklist.</p>';return;}
 host.innerHTML='<p class="empty">Loading requirements…</p>';
 const {data,error}=await db.from("package_input_requirements").select("*").eq("package_id",packageId).order("display_order");
 if(error){host.innerHTML='<p class="empty">Could not load input requirements: '+safe(error.message)+'</p>';return;}
 if(!data?.length){host.innerHTML='<p class="empty">No input requirements yet. Add the minimum information clients must provide.</p>';return;}
 host.innerHTML=data.map((r,i)=>'<article class="input-template-row" data-input-template="'+r.id+'"><div class="input-template-fields"><label>Input / Document<input data-input-field="requirement_name" value="'+safe(r.requirement_name)+'" maxlength="160"></label><label>What client should provide<textarea data-input-field="description" rows="2" maxlength="1200">'+safe(r.description||"")+'</textarea></label></div><div class="input-template-actions"><label class="feature-active"><input data-input-field="is_required" type="checkbox" '+(r.is_required?'checked':'')+'> Required</label><label class="feature-active"><input data-input-field="is_active" type="checkbox" '+(r.is_active?'checked':'')+'> Active</label><button class="secondary" data-save-input-template="'+r.id+'" type="button">Save</button><button class="delete" data-delete-input-template="'+r.id+'" type="button">Remove</button></div></article>').join("");
 host.querySelectorAll("[data-save-input-template]").forEach(b=>b.addEventListener("click",()=>saveInputTemplate(b.dataset.saveInputTemplate)));
 host.querySelectorAll("[data-delete-input-template]").forEach(b=>b.addEventListener("click",()=>deleteInputTemplate(b.dataset.deleteInputTemplate)));
}
async function saveInputTemplate(id){
 const card=$("input-requirement-template-list").querySelector('[data-input-template="'+id+'"]');if(!card)return;
 const get=k=>card.querySelector('[data-input-field="'+k+'"]');
 const requirement_name=get("requirement_name").value.trim(),description=get("description").value.trim();
 if(!requirement_name||!description){alert("Enter the input name and its description.");return;}
 const {error}=await db.from("package_input_requirements").update({requirement_name,description,is_required:get("is_required").checked,is_active:get("is_active").checked,updated_at:new Date().toISOString()}).eq("id",id);
 if(error){alert("Could not save requirement: "+error.message);return;}
 await loadInputRequirementTemplates();
}
async function deleteInputTemplate(id){
 if(!confirm("Remove this requirement from the package template? Existing client tracking records will be retained."))return;
 const {error}=await db.from("package_input_requirements").delete().eq("id",id);
 if(error){alert("Could not remove requirement: "+error.message);return;}
 await loadInputRequirementTemplates();
}
$("input-requirement-add").addEventListener("click",async()=>{
 const packageId=$("feature-package-select").value;if(!packageId){alert("Choose a package first.");return;}
 const requirement_name=prompt("Input or document name required from the client:");if(!requirement_name?.trim())return;
 const description=prompt("Explain what the client should provide:");if(!description?.trim())return;
 const {error}=await db.from("package_input_requirements").insert({package_id:packageId,requirement_name:requirement_name.trim(),description:description.trim(),is_required:true,display_order:Date.now()%100000,is_active:true});
 if(error){alert("Could not add requirement: "+error.message);return;}
 await loadInputRequirementTemplates();
});
async function loadLeadInputTracking(initialise=false){
 const leadId=$("feature-lead-select").value,host=$("input-requirement-tracker");
 if(!leadId){host.innerHTML='<p class="empty">Select an existing lead to track received and pending inputs.</p>';return;}
 if(initialise){
  const {data:existing,error:readError}=await db.from("enquiry_input_tracking").select("id").eq("enquiry_id",leadId);
  if(readError){host.innerHTML='<p class="empty">Could not check existing checklist.</p>';return;}
  if(!existing?.length){
   const pkg=featurePackages.find(p=>p.id===$("feature-package-select").value);
   if(!pkg){host.innerHTML='<p class="empty">Choose the package first.</p>';return;}
   const {data:templates,error}=await db.from("package_input_requirements").select("*").eq("package_id",pkg.id).eq("is_active",true).order("display_order");
   if(error){host.innerHTML='<p class="empty">Could not load package requirements.</p>';return;}
   if(templates?.length){
    const rows=templates.map(t=>({enquiry_id:leadId,requirement_id:t.id,requirement_name:t.requirement_name,description:t.description,is_required:t.is_required,status:"pending"}));
    const saved=await db.from("enquiry_input_tracking").insert(rows);
    if(saved.error){host.innerHTML='<p class="empty">Could not initialise checklist: '+safe(saved.error.message)+'</p>';return;}
   }
  }
 }
 host.innerHTML='<p class="empty">Loading client inputs…</p>';
 const {data,error}=await db.from("enquiry_input_tracking").select("*").eq("enquiry_id",leadId).order("created_at");
 if(error){host.innerHTML='<p class="empty">Could not load client input tracking: '+safe(error.message)+'</p>';return;}
 if(!data?.length){host.innerHTML='<p class="empty">No checklist initialised. Click Load / Initialise for Selected Lead.</p>';return;}
 const received=data.filter(x=>x.status==="received").length,pending=data.filter(x=>x.is_required&&x.status!=="received"&&x.status!=="not_required").length;
 host.innerHTML='<div class="input-tracker-summary"><strong>'+received+' received</strong><span>'+pending+' required item(s) still pending</span></div>'+data.map(r=>'<article class="input-tracker-row" data-input-track="'+r.id+'"><div class="input-tracker-copy"><strong>'+safe(r.requirement_name)+'</strong>'+(r.is_required?'<span class="required-tag">Required</span>':'<span class="optional-tag">Optional</span>')+'<p>'+safe(r.description||"")+'</p></div><div class="input-tracker-controls"><label>Status<select data-track-field="status">'+Object.entries(inputStatusLabels).map(([v,l])=>'<option value="'+v+'" '+(r.status===v?'selected':'')+'>'+l+'</option>').join("")+'</select></label><label>Client response / file reference<input data-track-field="client_response" value="'+safe(r.client_response||"")+'" placeholder="e.g. Logo received by email"></label><label>Admin note<input data-track-field="admin_note" value="'+safe(r.admin_note||"")+'" placeholder="Internal note"></label><button class="primary" type="button" data-save-input-track="'+r.id+'">Save Status</button></div></article>').join("");
 host.querySelectorAll("[data-save-input-track]").forEach(b=>b.addEventListener("click",()=>saveLeadInputTracking(b.dataset.saveInputTrack)));
}
async function saveLeadInputTracking(id){
 const card=$("input-requirement-tracker").querySelector('[data-input-track="'+id+'"]');if(!card)return;
 const get=k=>card.querySelector('[data-track-field="'+k+'"]'),status=get("status").value;
 const payload={status,client_response:get("client_response").value.trim()||null,admin_note:get("admin_note").value.trim()||null,received_at:status==="received"?new Date().toISOString():null,updated_at:new Date().toISOString()};
 const {error}=await db.from("enquiry_input_tracking").update(payload).eq("id",id);
 if(error){alert("Could not update client input status: "+error.message);return;}
 await loadLeadInputTracking(false);
}
$("input-tracker-load").addEventListener("click",()=>loadLeadInputTracking(true));

async function loadFeaturePackages(){
 const select=$("feature-package-select");select.innerHTML='<option value="">Loading packages…</option>';
 const {data,error}=await db.from("pricing_packages").select("id,name,features,display_order").order("display_order");
 if(error){select.innerHTML='<option value="">Could not load packages</option>';return;}
 featurePackages=data||[];const previous=select.value;
 select.innerHTML='<option value="">Select a package</option>'+featurePackages.map(p=>'<option value="'+p.id+'">'+safe(p.name)+'</option>').join("");
 if(previous&&featurePackages.some(p=>p.id===previous))select.value=previous;else if(featurePackages.length)select.value=featurePackages[0].id;
 await loadFeatureRows();
}
async function loadFeatureRows(){
 const packageId=$("feature-package-select").value,country=$("feature-country-select").value,host=$("feature-list"),summary=$("feature-package-summary"),pkg=featurePackages.find(p=>p.id===packageId);
 if(!pkg){host.innerHTML='<p class="empty">Select a package to manage its features.</p>';summary.innerHTML="";return;}
 host.innerHTML='<p class="empty">Loading feature details…</p>';
 const [{data,error},{data:prices}]=await Promise.all([db.from("package_feature_details").select("*").eq("package_id",packageId).order("display_order"),db.from("pricing_package_prices").select("*").eq("package_id",packageId)]);
 if(error){host.innerHTML='<p class="empty">Could not load feature details. Check admin permissions and refresh.</p>';return;}
 featureRows=data||[];const priceMap={};(prices||[]).forEach(x=>priceMap[x.country_code]=x);
 summary.innerHTML='<strong>'+safe(pkg.name)+'</strong><span>'+featureRows.length+' features · '+safe(marketConfig[country].country_name)+' package price: '+safe(marketConfig[country].currency)+' '+Number(priceMap[country]?.amount||0).toLocaleString()+'</span>';
 renderFeatureRows();await loadInputRequirementTemplates();
}
function renderFeatureRows(){
 const host=$("feature-list"),country=$("feature-country-select").value;
 const key=({IN:"price_inr",US:"price_usd",CA:"price_cad",GB:"price_gbp"})[country];
 const symbol=({IN:"₹",US:"$",CA:"C$",GB:"£"})[country];
 if(!featureRows.length){host.innerHTML='<p class="empty">No feature details found. Use Add Feature to create one.</p>';return;}
 host.innerHTML=featureRows.map((f,i)=>'<article class="feature-admin-card" data-feature-card="'+f.id+'"><div class="feature-card-head"><strong>Feature '+(i+1)+'</strong><button class="delete" type="button" data-delete-feature="'+f.id+'">Remove</button></div><label>Feature Name<input data-field="feature_name" maxlength="160" value="'+safe(f.feature_name)+'"></label><label>Explanation<textarea data-field="explanation" rows="3" maxlength="1600">'+safe(f.explanation||"")+'</textarea></label><div class="feature-price-grid feature-price-single"><label>'+safe(marketConfig[country].country_name)+' Price · '+symbol+'<input data-field="price_current" type="number" min="0" step="0.01" value="'+(f[key]??0)+'"></label><span class="feature-country-note">Only '+safe(marketConfig[country].country_name)+' pricing is shown. Change the country above to edit another market.</span></div><div class="feature-card-foot"><label class="feature-active"><input data-field="is_active" type="checkbox" '+(f.is_active?'checked':'')+'> Include in package breakdown</label><button class="primary" type="button" data-save-feature="'+f.id+'">Save Feature</button></div><p class="feedback" data-feature-feedback></p></article>').join("");
 host.querySelectorAll("[data-save-feature]").forEach(b=>b.addEventListener("click",()=>saveFeature(b.dataset.saveFeature)));
 host.querySelectorAll("[data-delete-feature]").forEach(b=>b.addEventListener("click",()=>deleteFeature(b.dataset.deleteFeature)));
}
async function saveFeature(id){
 const card=$("feature-list").querySelector('[data-feature-card="'+id+'"]'),row=featureRows.find(x=>x.id===id);if(!card||!row)return;
 const val=name=>card.querySelector('[data-field="'+name+'"]'),feature_name=val("feature_name").value.trim(),explanation=val("explanation").value.trim(),amount=Number(val("price_current").value),feedback=card.querySelector("[data-feature-feedback]");
 if(!feature_name||!explanation||!Number.isFinite(amount)||amount<0){feedback.textContent="Enter a feature name, explanation and valid non-negative price.";feedback.className="feedback error";return;}
 const country=$("feature-country-select").value,key=({IN:"price_inr",US:"price_usd",CA:"price_cad",GB:"price_gbp"})[country];
 const payload={feature_name,explanation,[key]:amount,is_active:val("is_active").checked,updated_at:new Date().toISOString()};
 const {error}=await db.from("package_feature_details").update(payload).eq("id",id);
 if(error){feedback.textContent="Save failed: "+error.message;feedback.className="feedback error";return;}
 const pkg=featurePackages.find(p=>p.id===row.package_id),features=(pkg.features||[]).map(x=>x===row.feature_name?feature_name:x);
 const changed=await db.from("pricing_packages").update({features,updated_at:new Date().toISOString()}).eq("id",pkg.id);
 if(changed.error){feedback.textContent="Details saved, but package feature list sync failed: "+changed.error.message;feedback.className="feedback error";return;}
 pkg.features=features;Object.assign(row,payload);feedback.textContent="Feature details saved.";feedback.className="feedback";
}
async function deleteFeature(id){
 const row=featureRows.find(x=>x.id===id);if(!row||!confirm("Remove this feature from the package?"))return;
 const pkg=featurePackages.find(p=>p.id===row.package_id),removed=await db.from("package_feature_details").delete().eq("id",id);
 if(removed.error){alert("Feature could not be removed: "+removed.error.message);return;}
 const features=(pkg.features||[]).filter(x=>x!==row.feature_name),synced=await db.from("pricing_packages").update({features,updated_at:new Date().toISOString()}).eq("id",pkg.id);
 if(synced.error){alert("Feature record removed, but package list sync failed: "+synced.error.message);return;}
 pkg.features=features;await loadFeatureRows();
}
$("feature-package-select").addEventListener("change",loadFeatureRows);
function refreshFeatureLeadOptions(){
 const select=$("feature-lead-select"),old=select.value;
 select.innerHTML='<option value="">Select a lead to autofill contact details</option>'+enquiries.map(x=>'<option value="'+x.id+'">'+safe(x.customer_name)+' · '+safe(x.email||x.phone||"No contact")+'</option>').join("");
 if(old&&enquiries.some(x=>x.id===old))select.value=old;
}
$("feature-country-select").addEventListener("change",()=>loadFeatureRows());
$("feature-lead-select").addEventListener("change",async()=>{
 const lead=enquiries.find(x=>x.id===$("feature-lead-select").value);if(!lead)return;
 $("feature-client-name").value=lead.customer_name||"";
 $("feature-client-email").value=lead.email||"";
 $("feature-client-phone").value=lead.phone||"";
 if(lead.package_name){const pkg=featurePackages.find(p=>p.name===lead.package_name);if(pkg){$("feature-package-select").value=pkg.id;}}
 if(["IN","US","CA","GB"].includes(String(lead.package_country_code||"").toUpperCase()))$("feature-country-select").value=lead.package_country_code.toUpperCase();
 await loadFeatureRows();await loadLeadInputTracking(false);
});
$("feature-send-email").addEventListener("click",async()=>{
 const pkg=featurePackages.find(p=>p.id===$("feature-package-select").value),email=$("feature-client-email").value.trim(),name=$("feature-client-name").value.trim(),country=$("feature-country-select").value,leadId=$("feature-lead-select").value,feedback=$("feature-send-feedback"),btn=$("feature-send-email");
 if(!pkg){feedback.textContent="Please choose a package.";feedback.className="feedback error";return;}
 if(!email||!/^\S+@\S+\.\S+$/.test(email)){feedback.textContent="Enter a valid client email address.";feedback.className="feedback error";return;}
 btn.disabled=true;btn.textContent="Sending…";feedback.textContent="";
 const {data,error}=await db.functions.invoke("send-package-breakdown",{body:{package_id:pkg.id,country_code:country,recipient_email:email,recipient_name:name,enquiry_id:leadId||null,include_input_requirements:true}});
 btn.disabled=false;btn.textContent="✉ Send to Email";
 if(error){feedback.textContent="Email could not be sent: "+(error.message||"Please try again.");feedback.className="feedback error";return;}
 if(leadId)await db.from("enquiry_communications").insert({enquiry_id:leadId,channel:"email",message:"Package feature breakdown emailed to "+email+" for "+pkg.name+" ("+country+").",created_by:adminUser.id});
 if(leadId)await loadCommunicationHistory(leadId);
 feedback.textContent="Package details successfully sent to "+email+".";feedback.className="feedback";
});
$("feature-send-whatsapp").addEventListener("click",async()=>{
 const pkg=featurePackages.find(p=>p.id===$("feature-package-select").value),phone=$("feature-client-phone").value.replace(/\D/g,""),name=$("feature-client-name").value.trim(),country=$("feature-country-select").value,leadId=$("feature-lead-select").value,feedback=$("feature-send-feedback");
 if(!pkg){feedback.textContent="Please choose a package.";feedback.className="feedback error";return;}
 if(phone.length<8){feedback.textContent="Enter a valid WhatsApp number with country code.";feedback.className="feedback error";return;}
 const key=({IN:"price_inr",US:"price_usd",CA:"price_cad",GB:"price_gbp"})[country],symbol=({IN:"₹",US:"$",CA:"C$",GB:"£"})[country];
 const [{data:priceRows},{data:rows,error}]=await Promise.all([db.from("pricing_package_prices").select("amount").eq("package_id",pkg.id).eq("country_code",country),db.from("package_feature_details").select("feature_name,explanation,"+key+",is_active,display_order").eq("package_id",pkg.id).eq("is_active",true).order("display_order")]);
 if(error){feedback.textContent="Could not prepare feature details.";feedback.className="feedback error";return;}
 const total=priceRows?.[0]?.amount;
 const lines=["*MRV NEXORA SOLUTIONS*","*"+pkg.name+" — Package Details*","Market: "+marketConfig[country].country_name,"Package Price: "+symbol+" "+Number(total||0).toLocaleString(),""];
 (rows||[]).forEach((f,i)=>lines.push((i+1)+". *"+f.feature_name+"*","   "+f.explanation,"   Estimated value: "+symbol+" "+Number(f[key]||0).toLocaleString(),""));
 lines.push("Feature-wise values are indicative allocations included in the package total, not additional charges.","Final scope and pricing will be confirmed in the project proposal.","https://mrvnexora.com");
 const textMsg=(name?"Hi "+name+",\n\n":"Hello,\n\n")+"Thank you for your interest. Please find the package details below.\n\n"+lines.join("\n");
 window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(textMsg),"_blank","noopener");
 if(leadId)await db.from("enquiry_communications").insert({enquiry_id:leadId,channel:"whatsapp",message:"Prepared and opened WhatsApp package breakdown for "+pkg.name+" ("+country+").",created_by:adminUser.id});
 feedback.textContent="WhatsApp message prepared. Review it in WhatsApp and press Send.";feedback.className="feedback";
});

$("features-refresh").addEventListener("click",loadFeaturePackages);
$("feature-add").addEventListener("click",async()=>{
 const pkg=featurePackages.find(p=>p.id===$("feature-package-select").value);if(!pkg)return;
 const name=prompt("Enter the new feature name:");if(!name||!name.trim())return;
 if((pkg.features||[]).some(x=>x.toLowerCase()===name.trim().toLowerCase())){alert("This feature already exists in the package.");return;}
 const {error}=await db.from("package_feature_details").insert({package_id:pkg.id,feature_name:name.trim(),explanation:"Add a clear explanation of what this feature includes and what the client can expect.",price_inr:0,price_usd:0,price_cad:0,price_gbp:0,display_order:(pkg.features||[]).length+1,is_active:true});
 if(error){alert("Could not add feature: "+error.message);return;}
 const features=[...(pkg.features||[]),name.trim()],synced=await db.from("pricing_packages").update({features,updated_at:new Date().toISOString()}).eq("id",pkg.id);
 if(synced.error){alert("Feature added, but package list sync failed: "+synced.error.message);return;}
 pkg.features=features;await loadFeatureRows();
});

let pricingPackages=[];
async function loadPricingPackages(){
 $("admin-pricing-list").innerHTML='<p class="empty">Loading packages…</p>';
 const {data,error}=await db.from("pricing_packages").select("*").order("display_order",{ascending:true});
 if(error){$("admin-pricing-list").innerHTML='<p class="empty">Could not load packages. Check pricing table permissions.</p>';return;}
 pricingPackages=data||[];
 const {data:priceRows,error:priceError}=await db.from("pricing_package_prices").select("*");
 if(priceError){$("admin-pricing-list").innerHTML='<p class="empty">Could not load country prices. Check pricing permissions.</p>';return;}
 pricingPackages.forEach(pkg=>pkg.marketPrices=(priceRows||[]).filter(p=>p.package_id===pkg.id));
 renderPricingPackages();
}
function renderPricingPackages(){
 const host=$("admin-pricing-list");
 if(!pricingPackages.length){host.innerHTML='<p class="empty">No packages yet. Create your first package above.</p>';return;}
 host.innerHTML=pricingPackages.map(pkg=>{
  const priceSummary=(pkg.marketPrices||[]).map(p=>marketConfig[p.country_code].currency+" "+Number(p.amount||0).toLocaleString()).join(" · ");
  return '<article class="admin-package-row"><div><h3>'+safe(pkg.name)+' '+(pkg.is_published?'<span class="status-tag">Published</span>':'<span class="status-tag">Draft</span>')+'</h3><p>'+safe(pkg.slug)+' · '+safe(pkg.service_type||"General")+'<br>'+safe(priceSummary|| (pkg.is_custom_quote?"Custom quote only":"No market prices set"))+'</p></div><div class="admin-package-actions"><button class="edit" type="button" data-edit-package="'+pkg.id+'">Edit</button><button class="delete" type="button" data-delete-package="'+pkg.id+'">Delete</button></div></article>';
 }).join("");
 host.querySelectorAll("[data-edit-package]").forEach(b=>b.addEventListener("click",()=>editPricingPackage(b.dataset.editPackage)));
 host.querySelectorAll("[data-delete-package]").forEach(b=>b.addEventListener("click",()=>deletePricingPackage(b.dataset.deletePackage)));
}
function resetPricingForm(){
 const form=$("pricing-form");form.reset();form.elements.id.value="";form.elements.display_order.value="1";
 $("pricing-feedback").textContent="";form.querySelector('button[type="submit"]').textContent="Save Package";
}
async function editPricingPackage(id){
 const pkg=pricingPackages.find(p=>p.id===id);if(!pkg)return;
 const form=$("pricing-form");form.elements.id.value=pkg.id;form.elements.name.value=pkg.name||"";form.elements.slug.value=pkg.slug||"";form.elements.service_type.value=pkg.service_type||"";form.elements.display_order.value=pkg.display_order||0;form.elements.description.value=pkg.description||"";form.elements.features.value=Array.isArray(pkg.features)?pkg.features.join("\n"):"";form.elements.is_custom_quote.checked=!!pkg.is_custom_quote;form.elements.is_published.checked=!!pkg.is_published;
 ["IN","US","CA","GB"].forEach(code=>{const row=(pkg.marketPrices||[]).find(p=>p.country_code===code);form.elements["price_"+code].value=row?.amount??"";});
 form.querySelector('button[type="submit"]').textContent="Update Package";
 form.scrollIntoView({behavior:"smooth",block:"start"});
}
async function deletePricingPackage(id){
 const pkg=pricingPackages.find(p=>p.id===id);if(!pkg||!confirm("Delete "+pkg.name+" and all its country prices?"))return;
 const {error}=await db.from("pricing_packages").delete().eq("id",id);
 if(error){alert("Package could not be deleted. Check admin permissions.");return;}
 await loadPricingPackages();resetPricingForm();
}
$("pricing-form").addEventListener("submit",async e=>{
 e.preventDefault();e.stopPropagation();const form=e.currentTarget,fd=new FormData(form),feedback=$("pricing-feedback"),button=form.querySelector('button[type="submit"]');
 const name=String(fd.get("name")||"").trim(),slug=String(fd.get("slug")||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
 if(!name||!slug){feedback.textContent="Package name and URL slug are required.";feedback.className="feedback error";return;}
 const payload={name,slug,service_type:String(fd.get("service_type")||"").trim()||null,description:String(fd.get("description")||"").trim()||null,features:String(fd.get("features")||"").split("\n").map(x=>x.trim()).filter(Boolean).slice(0,30),price:null,currency:"INR",is_custom_quote:form.elements.is_custom_quote.checked,is_published:form.elements.is_published.checked,display_order:Number(fd.get("display_order")||0),updated_at:new Date().toISOString()};
 button.disabled=true;button.textContent="Saving…";
 let packageId=form.elements.namedItem("id").value;
 let result;
 if(packageId) result=await db.from("pricing_packages").update(payload).eq("id",packageId).select("id").single();
 else result=await db.from("pricing_packages").insert(payload).select("id").single();
 if(result.error){button.disabled=false;button.textContent=packageId?"Update Package":"Save Package";feedback.textContent="Package save failed: "+(result.error.message||"Please check permissions and required fields.");feedback.className="feedback error";console.error("Pricing package save failed",result.error);return;}
 packageId=result.data.id;
 let priceError=null;
 for(const code of ["IN","US","CA","GB"]){
  const raw=String(fd.get("price_"+code)||"").trim();
  if(raw===""){
   const removed=await db.from("pricing_package_prices").delete().eq("package_id",packageId).eq("country_code",code);
   if(removed.error)priceError=removed.error;
  }else{
   const amount=Number(raw);
   if(!Number.isFinite(amount)||amount<0){priceError=new Error("Invalid price");break;}
   const saved=await db.from("pricing_package_prices").upsert({package_id:packageId,country_code:code,country_name:marketConfig[code].country_name,currency:marketConfig[code].currency,amount,is_available:true,updated_at:new Date().toISOString()},{onConflict:"package_id,country_code"});
   if(saved.error)priceError=saved.error;
  }
 }
 button.disabled=false;button.textContent=packageId?"Update Package":"Save Package";
 if(priceError){feedback.textContent="Package saved, but a country price failed: "+(priceError.message||"Please edit and retry.");feedback.className="feedback error";console.error("Country price save failed",priceError);}
 else {feedback.textContent="Package and country prices saved successfully.";feedback.className="feedback";resetPricingForm();}
 await loadPricingPackages();
});
$("pricing-reset").addEventListener("click",resetPricingForm);
$("pricing-refresh").addEventListener("click",loadPricingPackages);
})();
