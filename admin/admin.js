(() => {
const URL="https://pjrturqykjvplyrbvjte.supabase.co";
const KEY="sb_publishable_-M4jYj9CgTglX-IPOCfT-w_tedDSZFF";
const db=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id);
let enquiries=[],selected=null,adminUser=null;
const statuses=[["new","New"],["contacted","Contacted"],["in_progress","In Progress"],["quoted","Quoted"],["closed","Closed"]];
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
document.querySelectorAll(".side-link").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".side-link").forEach(x=>x.classList.toggle("active",x===btn));const view=btn.dataset.view;$("enquiries-view").hidden=view!=="enquiries";$("pricing-view").hidden=view!=="pricing";$("settings-view").hidden=view!=="settings";$("page-title").textContent=view==="settings"?"Contact Settings":view==="pricing"?"Pricing Management":"Project Enquiries";if(view==="pricing")loadPricingPackages();}));
async function loadEnquiries(){
 $("enquiry-list").innerHTML='<p class="empty">Loading enquiries…</p>';
 const {data,error}=await db.from("project_enquiries").select("*").order("created_at",{ascending:false});
 if(error){$("enquiry-list").innerHTML='<p class="empty">Could not load enquiries. Please refresh or check admin permissions.</p>';return;}
 enquiries=data||[];$("total-count").textContent=enquiries.length;$("new-count").textContent=enquiries.filter(x=>x.status==="new").length;$("progress-count").textContent=enquiries.filter(x=>x.status==="in_progress").length;$("closed-count").textContent=enquiries.filter(x=>x.status==="closed").length;$("nav-count").textContent=enquiries.filter(x=>x.status==="new").length;renderEnquiries();
}
function renderEnquiries(){
 const term=$("enquiry-search").value.toLowerCase(),filter=$("status-filter").value;
 const rows=enquiries.filter(x=>(!filter||x.status===filter)&&[x.customer_name,x.email,x.phone,x.project_type,x.business_name].some(v=>String(v||"").toLowerCase().includes(term)));
 if(!rows.length){$("enquiry-list").innerHTML='<p class="empty">No enquiries match this view.</p>';return;}
 $("enquiry-list").innerHTML=rows.map(x=>{const label=statuses.find(s=>s[0]===x.status)?.[1]||x.status;return '<article class="enquiry-card"><div><h3>'+safe(x.customer_name)+' <span class="status-tag">'+safe(label)+'</span></h3><p>'+safe(x.project_type)+' · '+safe(x.estimated_budget||"Budget not specified")+'</p><p>'+safe(x.email||"No email")+' · '+safe(x.phone)+' · '+new Date(x.created_at).toLocaleString()+'</p></div><div class="card-actions"><select aria-label="Update status" data-status="'+x.id+'">'+statuses.map(s=>'<option value="'+s[0]+'" '+(s[0]===x.status?"selected":"")+'>'+s[1]+'</option>').join("")+'</select><button class="tiny-btn" data-details="'+x.id+'">View details</button><a class="tiny-btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/'+String(x.phone||"").replace(/\D/g,"")+'">WhatsApp</a><a class="tiny-btn" href="tel:'+safe(x.phone)+'">Call</a></div></article>';}).join("");
 document.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("change",()=>updateStatus(el.dataset.status,el.value)));
 document.querySelectorAll("[data-details]").forEach(el=>el.addEventListener("click",()=>openDetails(el.dataset.details)));
}
async function updateStatus(id,status){const {error}=await db.from("project_enquiries").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error){alert("Status could not be updated. Check admin permissions.");return;}const item=enquiries.find(x=>x.id===id);if(item)item.status=status;loadEnquiries();}
function openDetails(id){selected=enquiries.find(x=>x.id===id);if(!selected)return;$("detail-name").textContent=selected.customer_name;$("admin-notes").value=selected.admin_notes||"";const fields=[["Business",selected.business_name],["Email",selected.email],["Phone",selected.phone],["Service",selected.project_type],["Budget",selected.estimated_budget],["Submitted",new Date(selected.created_at).toLocaleString()],["Project Details",selected.description],["Required Features",selected.required_features],["Expected Timeline",selected.expected_timeline]];$("detail-content").innerHTML=fields.filter(f=>f[1]).map(f=>'<div><b>'+safe(f[0])+'</b>'+safe(f[1])+'</div>').join("");$("detail-whatsapp").onclick=()=>window.open("https://wa.me/"+String(selected.phone||"").replace(/\D/g,""),"_blank","noopener");$("detail-modal").hidden=false;}
$("modal-close").addEventListener("click",()=>$("detail-modal").hidden=true);
$("detail-modal").addEventListener("click",e=>{if(e.target===$("detail-modal"))$("detail-modal").hidden=true;});
$("save-notes").addEventListener("click",async()=>{if(!selected)return;const {error}=await db.from("project_enquiries").update({admin_notes:$("admin-notes").value,updated_at:new Date().toISOString()}).eq("id",selected.id);if(error){alert("Notes could not be saved.");return;}selected.admin_notes=$("admin-notes").value;alert("Admin notes saved.");});
$("refresh-enquiries").addEventListener("click",loadEnquiries);$("enquiry-search").addEventListener("input",renderEnquiries);$("status-filter").addEventListener("change",renderEnquiries);
async function loadSettings(){const {data,error}=await db.from("site_settings").select("contact_settings").eq("id","contact").maybeSingle();if(error||!data)return;const s=data.contact_settings||{},form=$("settings-form");["business_email","contact_number","whatsapp_number","location","service_availability","business_hours"].forEach(k=>form.elements[k].value=s[k]||"");["instagram","linkedin","facebook","youtube"].forEach(k=>form.elements[k].value=s.social_links?.[k]||"");form.elements.budget_ranges.value=Array.isArray(s.budget_ranges)?s.budget_ranges.join("\n"):"";}
$("settings-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form),feedback=$("settings-feedback"),button=form.querySelector("button[type=submit]");const cleanUrl=v=>{v=String(v||"").trim();if(!v)return "";try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}};const settings={business_email:String(fd.get("business_email")||"").trim(),contact_number:String(fd.get("contact_number")||"").trim(),whatsapp_number:String(fd.get("whatsapp_number")||"").trim(),location:String(fd.get("location")||"").trim(),service_availability:String(fd.get("service_availability")||"").trim(),business_hours:String(fd.get("business_hours")||"").trim(),social_links:{instagram:cleanUrl(fd.get("instagram")),linkedin:cleanUrl(fd.get("linkedin")),facebook:cleanUrl(fd.get("facebook")),youtube:cleanUrl(fd.get("youtube"))},budget_ranges:String(fd.get("budget_ranges")||"").split("\n").map(x=>x.trim()).filter(Boolean).slice(0,20)};button.disabled=true;button.textContent="Saving…";const {error}=await db.from("site_settings").update({contact_settings:settings,updated_at:new Date().toISOString(),updated_by:adminUser.id}).eq("id","contact");button.disabled=false;button.textContent="Save Contact Settings";feedback.textContent=error?"Could not save settings. Verify admin access and try again.":"Contact settings saved successfully. The public website will load the latest details.";feedback.className=error?"feedback error":"feedback";});
db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){adminUser=null;showLogin();}});
verifySession();
})();
/* International pricing package management */
const marketConfig={
 IN:{country_name:"India",currency:"INR"},
 US:{country_name:"United States",currency:"USD"},
 CA:{country_name:"Canada",currency:"CAD"},
 GB:{country_name:"United Kingdom",currency:"GBP"}
};
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
