const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    menuButton.textContent = isOpen ? "×" : "☰";
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open menu");
      menuButton.textContent = "☰";
    });
  });
}
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
const sections = [...document.querySelectorAll("main section[id]")];
const pageLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      pageLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
      });
    });
  }, { rootMargin: "-35% 0px -55% 0px" });
  sections.forEach((section) => observer.observe(section));
}

// MRV Nexora contact settings and project enquiry form
(() => {
  const SUPABASE_URL = "https://pjrturqykjvplyrbvjte.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_-M4jYj9CgTglX-IPOCfT-w_tedDSZFF";
  if (!window.supabase) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const setText = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
  const digits = (value) => String(value || "").replace(/\D/g, "");
  async function loadContactSettings() {
    const { data, error } = await client.from("site_settings").select("contact_settings").eq("id", "contact").maybeSingle();
    if (error || !data?.contact_settings) return;
    const s = data.contact_settings;
    setText("contact-email", s.business_email); const emailLink = document.getElementById("contact-email-link"); if(emailLink && s.business_email) emailLink.href = "mailto:" + s.business_email;
    setText("contact-phone", s.contact_number || "Contact details coming soon"); const phoneLink = document.getElementById("contact-phone-link"); if(phoneLink && s.contact_number) phoneLink.href = "tel:" + s.contact_number.replace(/[^+\d]/g,"");
    setText("contact-whatsapp", s.whatsapp_number ? "Chat with us on WhatsApp" : "Chat with us"); const wa = document.getElementById("contact-whatsapp-link"); if(wa && s.whatsapp_number){wa.href="https://wa.me/"+digits(s.whatsapp_number);wa.hidden=false;} else if(wa){wa.hidden=true;}
    setText("contact-location", s.location); setText("contact-availability", s.service_availability); setText("contact-hours", s.business_hours);
    const social = document.getElementById("contact-social-links");
    if(social){social.replaceChildren();const labels={instagram:"Instagram",linkedin:"LinkedIn",facebook:"Facebook",youtube:"YouTube"};let count=0;Object.entries(s.social_links||{}).forEach(([key,url])=>{if(!url)return;try{const parsed=new URL(url);if(!["https:","http:"].includes(parsed.protocol))return;const a=document.createElement("a");a.href=parsed.href;a.target="_blank";a.rel="noopener";a.textContent=labels[key]||key;social.append(a);count++;}catch{}});if(!count){const span=document.createElement("span");span.textContent="Social links will be updated soon.";social.append(span);}}
    const budget = document.getElementById("budget-options");
    if(budget && Array.isArray(s.budget_ranges) && s.budget_ranges.length){const keep=budget.options[0];budget.replaceChildren(keep);s.budget_ranges.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;budget.append(o);});const other=document.createElement("option");other.value="Not sure yet – Let's discuss";other.textContent="Not sure yet – Let's discuss";budget.append(other);}
  }
  loadContactSettings();
  const form=document.getElementById("project-enquiry-form"); if(!form)return;
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();const feedback=document.getElementById("enquiry-feedback");const button=form.querySelector("button[type=submit]");const label=button.querySelector(".submit-label");
    const values=Object.fromEntries(new FormData(form).entries());
    values.customer_name=String(values.customer_name||"").trim();values.email=String(values.email||"").trim();values.phone=String(values.phone||"").trim();values.business_name=String(values.business_name||"").trim();values.project_type=String(values.project_type||"").trim();values.estimated_budget=String(values.estimated_budget||"").trim();values.description=String(values.description||"").trim();
    if(!values.customer_name||!values.email||!values.phone||!values.project_type||!values.description){feedback.textContent="Please complete all required fields.";feedback.className="form-feedback show error";return;}
    button.disabled=true;label.textContent="Submitting...";feedback.className="form-feedback";
    const {data,error}=await client.from("project_enquiries").insert({customer_name:values.customer_name,business_name:values.business_name||null,email:values.email,phone:values.phone,project_type:values.project_type,estimated_budget:values.estimated_budget||null,description:values.description,status:"new"});
    if(error){feedback.textContent="We couldn't submit your enquiry right now. Please try again in a moment or contact us directly.";feedback.className="form-feedback show error";button.disabled=false;label.textContent="Submit Project Enquiry";return;}
    feedback.textContent="Your enquiry has been saved. Sending confirmation emails...";feedback.className="form-feedback show success";
    try {
      const emailResponse = await fetch(SUPABASE_URL+"/functions/v1/send-enquiry-confirmation", {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},
        body:JSON.stringify({
          customer_name:values.customer_name,
          email:values.email,
          phone:values.phone,
          business_name:values.business_name,
          project_type:values.project_type,
          estimated_budget:values.estimated_budget,
          description:values.description
        })
      });
      const emailResult = await emailResponse.json().catch(()=>({}));
      if(emailResponse.ok && emailResult.customer_email_sent && emailResult.admin_email_sent) {
        feedback.textContent="Thank you! Your enquiry has been received. A confirmation email has been sent to you, and our team has been notified.";
      } else {
        feedback.textContent="Your enquiry has been saved successfully, but email notifications could not be sent just now. Our team will still review your request.";
        feedback.className="form-feedback show error";
        console.error("Enquiry email notification issue", emailResult);
      }
    } catch(error) {
      feedback.textContent="Your enquiry has been saved successfully, but email notifications could not be sent just now. Our team will still review your request.";
      feedback.className="form-feedback show error";
      console.error("Enquiry email request failed", error);
    }
    form.reset();button.disabled=false;label.textContent="Submit Project Enquiry";
  });
})();

/* MRV Nexora country-aware pricing */
(() => {
  const SUPABASE_URL = "https://pjrturqykjvplyrbvjte.supabase.co";
  const SUPABASE_KEY = "sb_publishable_-M4jYj9CgTglX-IPOCfT-w_tedDSZFF";
  const grid = document.getElementById("pricing-grid");
  const selector = document.getElementById("pricing-country");
  if (!grid || !selector || !window.supabase) return;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const markets = {
    IN:{name:"India",currency:"INR",locale:"en-IN"},
    US:{name:"United States",currency:"USD",locale:"en-US"},
    CA:{name:"Canada",currency:"CAD",locale:"en-CA"},
    GB:{name:"United Kingdom",currency:"GBP",locale:"en-GB"}
  };
  let packages = [];
  let prices = [];
  let userChanged = false;
  const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function formatAmount(amount, market) {
    return new Intl.NumberFormat(market.locale,{style:"currency",currency:market.currency,maximumFractionDigits:2}).format(Number(amount));
  }
  function render() {
    const code = selector.value;
    const market = markets[code] || markets.IN;
    const current = prices.filter(p => p.country_code === code);
    const byPackage = new Map(current.map(p => [p.package_id,p]));
    if (!packages.length) {
      grid.innerHTML = '<p class="pricing-empty">Our pricing packages are being prepared. Tell us about your project and we will create a tailored proposal.</p>';
      return;
    }
    grid.innerHTML = packages.map(pkg => {
      const price = byPackage.get(pkg.id);
      const custom = pkg.is_custom_quote || !price || price.amount === null;
      const amount = custom ? "Let’s talk" : formatAmount(price.amount,market);
      const features = Array.isArray(pkg.features) ? pkg.features : [];
      return '<article class="pricing-card"><h3>'+safe(pkg.name)+'</h3><p>'+safe(pkg.description||"A solution tailored to your business goals.")+'</p><div class="pricing-amount">'+amount+'</div><div class="pricing-period">'+(custom?"Custom project proposal":safe(market.name+" · "+market.currency))+'</div><ul class="pricing-features">'+features.map(f=>'<li>'+safe(f)+'</li>').join("")+'</ul><a class="pricing-cta" href="#contact" data-package="'+safe(pkg.name)+'">Discuss this package ↗</a></article>';
    }).join("");
  }
  async function loadPackages() {
    grid.innerHTML = '<p class="pricing-empty">Loading packages…</p>';
    const [pResult, priceResult] = await Promise.all([
      db.from("pricing_packages").select("id,name,slug,service_type,description,features,is_custom_quote,display_order").eq("is_published",true).order("display_order",{ascending:true}),
      db.from("pricing_package_prices").select("package_id,country_code,currency,amount").eq("is_available",true)
    ]);
    if (pResult.error || priceResult.error) {
      console.error("Pricing could not load",pResult.error||priceResult.error);
      grid.innerHTML = '<p class="pricing-empty">Pricing is temporarily unavailable. Please contact us for a quote.</p>';
      return;
    }
    packages = pResult.data || [];
    prices = priceResult.data || [];
    render();
  }
  selector.addEventListener("change",() => {userChanged=true;render();const note=document.getElementById("pricing-country-note");if(note)note.textContent="Showing "+markets[selector.value].name+" prices. You can change this anytime.";});
  async function detectCountry() {
    try {
      const response = await fetch("https://ipapi.co/json/",{headers:{Accept:"application/json"}});
      if (!response.ok) throw new Error("Country lookup unavailable");
      const data = await response.json();
      const code = String(data.country_code||"").toUpperCase();
      if (!userChanged && markets[code]) selector.value=code;
      const note=document.getElementById("pricing-country-note");
      if(note) note.textContent = "Country "+(markets[code]?.name || "not supported")+" estimated from your IP address (not GPS). Choose another market anytime.";
    } catch (_) {
      const note=document.getElementById("pricing-country-note");
      if(note) note.textContent="Showing India prices by default. Choose your market anytime.";
    }
    render();
  }
  loadPackages();
  detectCountry();
})();
