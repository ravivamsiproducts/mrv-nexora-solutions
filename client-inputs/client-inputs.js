(()=>{
const URL="https://pjrturqykjvplyrbvjte.supabase.co",KEY="sb_publishable_-M4jYj9CgTglX-IPOCfT-w_tedDSZFF";
const $=id=>document.getElementById(id),token=new URLSearchParams(location.search).get("token")||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function call(body){const r=await fetch(URL+"/functions/v1/client-input-portal",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:"Unexpected server response."}));if(!r.ok)throw new Error(d.error||"Request failed.");return d;}
function updateProgress(items){const done=items.filter(x=>x.status==="received").length;$("progress-count").textContent=done+" / "+items.length+" received";$("progress-bar").style.width=(items.length?done/items.length*100:0)+"%";}
function render(items){
 $("requirements").innerHTML=items.map((r,i)=>'<article class="requirement" data-id="'+esc(r.id)+'"><h2>'+(i+1)+'. '+esc(r.requirement_name)+(r.is_required?'<span class="tag">Required</span>':'<span class="tag optional">Optional</span>')+(r.status==="received"?'<span class="received">✓ Received</span>':'')+'</h2><p>'+esc(r.description||"")+'</p><label>Your details / message<textarea data-response placeholder="Type your response or any relevant details…">'+esc(r.client_response||"")+'</textarea></label><label>Attach a file <span class="file-help">PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX, CSV or TXT · Max 10 MB</span><input type="file" data-file accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"></label><div class="actions"><button class="button" type="button" data-submit>Save &amp; Submit</button><span class="status" role="status"></span></div></article>').join("")||'<div class="panel">There are no input requirements pending for this project. Thank you.</div>';
 $("requirements").querySelectorAll("[data-submit]").forEach(btn=>btn.addEventListener("click",()=>submitItem(btn,items)));
 updateProgress(items);
}
async function submitItem(btn,items){
 const card=btn.closest("[data-id]"),id=card.dataset.id,response=card.querySelector("[data-response]").value.trim(),file=card.querySelector("[data-file]").files[0],status=card.querySelector(".status");
 if(!response&&!file){status.textContent="Add a response or choose a file first.";status.className="status error";return;}
 btn.disabled=true;btn.textContent="Submitting…";status.textContent="";
 try{
  if(response){await call({action:"save_response",token,requirement_id:id,response});}
  if(file){const form=new FormData();form.append("action","upload");form.append("token",token);form.append("requirement_id",id);form.append("file",file);const r=await fetch(URL+"/functions/v1/client-input-portal",{method:"POST",headers:{apikey:KEY},body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"File upload failed.");}
  status.textContent="Your information has been submitted.";status.className="status";const fresh=await call({action:"get_form",token});render(fresh.items);
 }catch(e){status.textContent=e.message||"Could not submit. Please try again.";status.className="status error";}
 finally{btn.disabled=false;btn.textContent="Save & Submit";}
}
async function init(){
 if(!token){$("loading").hidden=true;$("error").hidden=false;$("error").textContent="This secure link is incomplete. Please open the full link from the email you received.";return;}
 try{const d=await call({action:"get_form",token});$("loading").hidden=true;$("portal").hidden=false;$("client-name").textContent=d.client_name;$("package-name").textContent=d.package_name;render(d.items);}
 catch(e){$("loading").hidden=true;$("error").hidden=false;$("error").textContent=e.message||"This link is invalid or expired. Please contact MRV Nexora Solutions for a new link.";}
}
init();
})();