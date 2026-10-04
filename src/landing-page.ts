import { landingConnectLead } from "./connect-page.js";

export function renderLanding(appBaseUrl: string, supabaseUrl: string, supabaseAnonKey: string) {
  const connectLead = landingConnectLead(appBaseUrl);
  const config = JSON.stringify({ supabaseUrl, supabaseAnonKey, appBaseUrl }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#10141c">
  <title>Pitch</title><link rel="icon" href="/icon.svg">
  <style>
    :root{color-scheme:dark;--bg:#10141c;--panel:#171c27;--line:#2c3548;--text:#f3f6fb;--muted:#b7c0d0;--accent:#e7a15a;--accent2:#7eb6ff;--danger:#ff8f8f}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% -10%,#243044 0,transparent 32%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}
    .shell{max-width:980px;margin:0 auto;padding:28px 20px 72px}.nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:48px}.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:20px}.mark{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,var(--accent),#7eb6ff)}
    .hero{display:grid;grid-template-columns:1.25fr .75fr;gap:32px;align-items:center}.eyebrow{color:var(--accent2);font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(42px,7vw,72px);line-height:.95;letter-spacing:-.05em;margin:12px 0 16px}p{color:var(--muted);font-size:18px;line-height:1.6}.card{background:linear-gradient(180deg,#1c2433,#121722);border:1px solid var(--line);border-radius:24px;padding:22px}.mini{display:grid;gap:12px}.miniRow{padding:14px;border:1px solid var(--line);border-radius:15px;background:#121722}.miniRow b{display:block;margin-bottom:4px}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.btn{appearance:none;border:0;border-radius:14px;padding:14px 18px;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.primary{background:linear-gradient(135deg,#f0c08a,#c47a32);color:#1a1408}.secondary{background:#171c27;border:1px solid var(--line);color:var(--text)}.btn[disabled]{opacity:.5;cursor:wait}
    .section{margin-top:56px}.plans{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}.plan{border:1px solid var(--line);border-radius:22px;padding:22px;background:#121722;position:relative}.plan.featured{border-color:#e7a15a99}.tag{position:absolute;right:16px;top:16px;border:1px solid #e7a15a55;color:#f0c08a;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800}.plan ul{list-style:none;padding:0}.plan li{padding:6px 0}.plan li:before{content:'✓';color:var(--accent2);margin-right:8px}.plan .btn{width:100%}
    .account{margin-top:22px;display:none}.account.show{display:block}.email{font-weight:800;overflow-wrap:anywhere}.status{color:var(--muted);font-size:14px}.notice,.error{display:none;margin-top:16px;padding:12px 14px;border-radius:12px}.notice.show{display:block;background:#142218;border:1px solid #356348;color:#c8f5d4}.error.show{display:block;background:#2a1616;border:1px solid #6a3030;color:#ffc9c9}
    .footer{margin-top:64px;padding-top:20px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:#8b97ab;font-size:13px}
    [hidden]{display:none!important}label{display:block;margin:12px 0 6px;color:var(--muted)}input,textarea,select{width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;background:#0e131c;color:var(--text);font:inherit}textarea{min-height:90px}.workspaceGrid{display:grid;grid-template-columns:minmax(240px,.7fr) minmax(0,1.3fr);gap:16px}@media(max-width:760px){.hero,.plans,.workspaceGrid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav"><div class="brand"><span class="mark"></span>Pitch</div><span id="servicePill">Service online</span></nav>
    <section class="hero">
      <div>
        <div class="eyebrow" id="heroEyebrow">Approved facts a sales assistant may say</div>
        <h1 id="heroTitle">Say only what you approved.</h1>
        <p id="heroDescription">Pitch keeps the metrics, customer proof, and discount rules a sales assistant is allowed to say, then brings that record into ChatGPT, Claude, Gemini, Grok, Cursor, and other MCP assistants. If a fact is not approved, the tools say so.</p>
        ${connectLead}
        <div class="actions" id="signedOutActions"><button class="btn primary" id="googleBtn" type="button">Continue with Google</button><a class="btn secondary" href="#plans">See plans</a></div>
        <div class="account card" id="accountCard">
          <div class="email" id="userEmail"></div>
          <div class="status" id="subscriptionStatus">Checking account…</div>
          <div class="actions"><button class="btn secondary" id="signOutBtn" type="button">Sign out</button></div>
        </div>
        <div class="actions" id="proActions" hidden><a class="btn primary" href="/app">Open sales workspace</a></div>
        <button class="btn secondary" id="refreshAccount" hidden type="button">Refresh subscription status</button>
        <div class="notice" id="notice" role="status"></div><div class="error" id="error" role="alert"></div>
      </div>
      <aside class="card" id="salesAside">
        <div class="mini">
          <div class="miniRow"><b>Metrics</b><span>Numbers the owner locked. Anything else is not approved.</span></div>
          <div class="miniRow"><b>Customer proof</b><span>A result the owner approved. The name appears only if they recorded it.</span></div>
          <div class="miniRow"><b>Discount rules</b><span>An approved offer, or the rule that no discount is approved.</span></div>
          <div class="miniRow"><b>Sales audit</b><span>What the assistant is forbidden to invent.</span></div>
        </div>
      </aside>
    </section>
    <section class="section" id="plans" hidden>
      <h2>Choose your Pitch plan</h2>
      <p>Start with a 14-day trial, then Pro. Secure checkout and subscription billing are handled by Stripe. Checkout shows the billing terms before you confirm.</p>
      <div class="plans">
        <article class="plan"><h3>Monthly</h3><p>Flexible access while a product is in market.</p><ul><li>Private products</li><li>Approved metrics and proof</li><li>Discount rules</li><li>Sales audits</li></ul><button class="btn secondary checkout" data-plan="monthly" type="button">Start monthly trial</button></article>
        <article class="plan featured"><span class="tag">Longer cycles</span><h3>Yearly</h3><p>One billing cycle for a record that keeps growing.</p><ul><li>Everything in Monthly</li><li>One annual billing cycle</li><li>Built for several products</li><li>Same 14-day trial</li></ul><button class="btn primary checkout" data-plan="annual" type="button">Start yearly trial</button></article>
      </div>
    </section>
    <section class="section" id="workspace" hidden>
      <div class="eyebrow">Your Pitch workspace</div>
      <h2>Your approved record, ready for the next reply.</h2>
      <p><a href="/connect">Connect Pitch</a> to an assistant, then ask it to retrieve the product before it answers. Locked facts stay locked until you revise them.</p>
      <div class="workspaceGrid">
        <div class="card">
          <h3>Products</h3>
          <p id="productMessage" role="status"></p>
          <label for="productSelect">Open a product</label>
          <select id="productSelect"><option value="">Choose a product</option></select>
          <button class="btn secondary" id="reloadProducts" type="button">Refresh products</button>
          <form id="productForm">
            <h3>Start a product</h3>
            <label for="productName">Product name</label><input id="productName" required maxlength="200">
            <label for="productDescription">Description (optional)</label><textarea id="productDescription" maxlength="4000"></textarea>
            <button class="btn primary" type="submit">Create product</button>
          </form>
        </div>
        <div class="card" id="productDetail" hidden>
          <h3 id="productTitle"></h3>
          <p id="productSummary"></p>
          <form id="entryForm">
            <h3>Add an approved fact</h3>
            <label for="entryKind">Kind</label>
            <select id="entryKind"><option value="METRIC">Metric</option><option value="CUSTOMER_PROOF">Customer proof</option><option value="DISCOUNT">Approved discount</option><option value="NO_DISCOUNT">No discount is approved</option></select>
            <label for="entryTitle">Title</label><input id="entryTitle" required maxlength="200">
            <label for="entryStatus">State</label>
            <select id="entryStatus"><option>DEVELOPING</option><option>LOCKED</option><option>UNKNOWN</option></select>
            <label for="entryContent">Approved text</label><textarea id="entryContent" maxlength="12000"></textarea>
            <label for="entryCustomer">Customer name (only if you recorded it)</label><input id="entryCustomer" maxlength="200" placeholder="Leave blank when the name is not approved">
            <button class="btn primary" type="submit">Save approved fact</button>
          </form>
        </div>
      </div>
      <div id="factContent" hidden>
        <h3>Approved facts</h3>
        <div class="mini" id="entryList"></div>
        <form id="reviseForm" class="card">
          <h3>Revise a fact</h3>
          <p>Locked facts stay locked until you save a revision here. Use the revision number from the entry. Leave the customer name blank when it is not approved.</p>
          <label for="reviseKind">Kind</label>
          <select id="reviseKind"><option value="METRIC">Metric</option><option value="CUSTOMER_PROOF">Customer proof</option><option value="DISCOUNT">Approved discount</option><option value="NO_DISCOUNT">No discount is approved</option></select>
          <label for="reviseTitle">Existing title</label><input id="reviseTitle" required maxlength="200">
          <label for="reviseStatus">State</label>
          <select id="reviseStatus"><option>LOCKED</option><option>DEVELOPING</option><option>UNKNOWN</option><option>RETIRED</option></select>
          <label for="reviseContent">Revised text</label><textarea id="reviseContent" required maxlength="12000"></textarea>
          <label for="reviseCustomer">Customer name</label><input id="reviseCustomer" maxlength="200">
          <label for="reviseReason">Reason</label><input id="reviseReason" required maxlength="1000">
          <label for="reviseExpected">Expected revision</label><input id="reviseExpected" type="number" min="1" step="1" required>
          <button class="btn primary" type="submit">Save owner revision</button>
        </form>
      </div>
      <p class="status" id="workspaceMessage" role="status"></p>
    </section>
    <footer class="footer"><a href="/connect">Connect an assistant</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="/data">Your data</a><span>Pitch · approved facts for your sales assistants</span><a href="/health">System health</a></footer>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js"></script>
  <script>
  (function(){
    var cfg=${config};
    var token='', session=null, isPro=false, profileReady=false, products=[], selected='', profileVersion=0;
    function el(id){return document.getElementById(id)}
    function showError(msg){el('error').textContent=msg;el('error').classList.add('show')}
    function clearError(){el('error').classList.remove('show')}
    function showNotice(msg){el('notice').textContent=msg;el('notice').classList.add('show')}
    var client=null;
    function renderAccess(pro, ready){
      isPro=pro; profileReady=ready;
      el('plans').hidden=pro||!ready;
      el('salesAside').hidden=pro;
      el('proActions').hidden=!pro||location.pathname==='/app';
      el('workspace').hidden=!pro||location.pathname!=='/app';
      el('heroEyebrow').textContent=pro?'Pitch Pro':'Approved facts a sales assistant may say';
      if(pro&&location.pathname==='/app') void loadProducts();
    }
    function setSignedOut(){token='';session=null;renderAccess(false,true);el('refreshAccount').hidden=true;el('signedOutActions').style.display='flex';el('accountCard').classList.remove('show')}
    function setSignedIn(next){session=next;token=next.access_token||'';el('userEmail').textContent=next.user.email||'Google account';el('signedOutActions').style.display='none';el('accountCard').classList.add('show')}
    async function api(path, opts){
      var options=opts||{}; options.headers=Object.assign({apikey:cfg.supabaseAnonKey}, options.headers||{});
      if(token) options.headers.Authorization='Bearer '+token;
      var r=await fetch(cfg.supabaseUrl+path, options); var txt=await r.text();
      if(!r.ok) throw Error(txt||('Request failed '+r.status));
      return txt?JSON.parse(txt):null;
    }
    async function loadProfile(current){
      var version=++profileVersion; el('refreshAccount').hidden=false;
      try{
        var profiles=await api('/rest/v1/profiles?id=eq.'+encodeURIComponent(current.user.id)+'&select=plan,subscription_status,current_period_end');
        if(version!==profileVersion) return;
        var p=profiles&&profiles[0], pro=Boolean(p&&(p.subscription_status==='trialing'||p.subscription_status==='active'));
        renderAccess(pro,true);
        el('subscriptionStatus').textContent=pro?(p.subscription_status==='trialing'?'Pitch Pro · Trial in progress':'Pitch Pro · Active'):'Signed in · choose a plan below';
      }catch(e){if(version===profileVersion){renderAccess(false,false);el('subscriptionStatus').textContent='Unable to confirm your subscription. Use Refresh subscription status to try again.';}}
    }
    function cards(id, rows, empty, heading, body){
      var list=el(id); list.replaceChildren();
      if(!rows.length){var p=document.createElement('p');p.textContent=empty;list.append(p);return}
      rows.forEach(function(row){var card=document.createElement('article');card.className='miniRow';var h=document.createElement('b');h.textContent=heading(row);var t=document.createElement('div');t.textContent=body(row);card.append(h,t);list.append(card)});
    }
    async function loadProducts(){
      el('productMessage').textContent='Loading your products…';
      try{
        var rows=await api('/rest/v1/products?select=id,name,description&order=updated_at.desc&limit=50')||[];
        products=rows; el('productSelect').replaceChildren(new Option('Choose a product',''));
        rows.forEach(function(p){el('productSelect').add(new Option(p.name,p.id))});
        el('productMessage').textContent=rows.length?'Choose a product below.':'No products yet. Create the first one below.';
        if(!rows.some(function(p){return p.id===selected})) selected='';
        el('productSelect').value=selected; await loadFacts();
      }catch(e){el('productMessage').textContent='Could not load products. Use Refresh products to try again.';}
    }
    function factBody(row){
      var extra='';
      if(row.kind==='CUSTOMER_PROOF') extra=row.customer_name?(' Customer: '+row.customer_name):' Customer name is not approved.';
      if(row.kind==='NO_DISCOUNT') extra=' No discount is approved.';
      if(row.status!=='LOCKED') extra+=' This fact is not approved.';
      return row.content+extra;
    }
    async function loadFacts(){
      var product=products.find(function(p){return p.id===selected});
      el('productDetail').hidden=!product; el('factContent').hidden=!product;
      if(!product) return;
      el('productTitle').textContent=product.name; el('productSummary').textContent=product.description||'';
      try{
        var entries=await api('/rest/v1/approved_facts?product_id=eq.'+encodeURIComponent(product.id)+'&status=neq.RETIRED&select=id,kind,title,status,content,customer_name,revision&order=updated_at.desc')||[];
        cards('entryList', entries, 'No approved facts yet.', function(r){return r.title+' · '+r.kind+' · '+r.status+' · revision '+r.revision}, factBody);
      }catch(e){el('workspaceMessage').textContent='Could not load this product. Refresh and retry.'}
    }
    el('productSelect').onchange=function(){selected=this.value; void loadFacts()};
    el('reloadProducts').onclick=function(){if(isPro) void loadProducts()};
    el('productForm').onsubmit=async function(event){
      event.preventDefault(); if(!isPro||!session) return;
      var name=el('productName').value.trim(); if(!name) return;
      try{
        var rows=await api('/rest/v1/products',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({owner_id:session.user.id,name:name,description:el('productDescription').value.trim()||null})});
        this.reset(); selected=rows[0].id; await loadProducts(); el('workspaceMessage').textContent='Product created.';
      }catch(e){el('workspaceMessage').textContent='Could not create the product. Your form is still here.'}
    };
    el('entryForm').onsubmit=async function(event){
      event.preventDefault(); if(!isPro||!selected) return;
      var kind=el('entryKind').value;
      var content=el('entryContent').value.trim();
      if(kind==='NO_DISCOUNT') content=content||'No discount is approved.';
      if(kind==='DISCOUNT'&&!content){el('workspaceMessage').textContent='A discount is not approved until you enter the terms you approve.';return}
      if(kind!=='NO_DISCOUNT'&&kind!=='DISCOUNT'&&!content){el('workspaceMessage').textContent='Enter the approved text.';return}
      var customer=kind==='CUSTOMER_PROOF'?el('entryCustomer').value.trim()||null:null;
      try{
        await api('/rest/v1/rpc/save_pitch_fact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_product:selected,p_kind:kind,p_title:el('entryTitle').value.trim(),p_status:el('entryStatus').value,p_content:content,p_tags:[],p_reason:'Owner-approved sales fact',p_expected:null,p_revise:false,p_owner:session.user.id,p_customer_name:customer})});
        this.reset(); await loadFacts(); el('workspaceMessage').textContent=customer?'Approved fact saved with the customer name you recorded.':'Approved fact saved. A missing customer name is not approved. A locked fact stays locked until you revise it.';
      }catch(e){el('workspaceMessage').textContent='Could not save this fact. If it is locked, revise it instead. Your text is still here.'}
    };
    el('reviseForm').onsubmit=async function(event){
      event.preventDefault(); if(!isPro||!selected) return;
      var kind=el('reviseKind').value;
      var customer=kind==='CUSTOMER_PROOF'?el('reviseCustomer').value.trim()||null:null;
      try{
        await api('/rest/v1/rpc/save_pitch_fact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_product:selected,p_kind:kind,p_title:el('reviseTitle').value.trim(),p_status:el('reviseStatus').value,p_content:el('reviseContent').value.trim(),p_tags:[],p_reason:el('reviseReason').value.trim(),p_expected:Number(el('reviseExpected').value),p_revise:true,p_owner:session.user.id,p_customer_name:customer})});
        await loadFacts(); el('workspaceMessage').textContent='Owner revision saved with history.';
      }catch(e){el('workspaceMessage').textContent='Revision could not save. Refresh and compare the revision number before retrying.'}
    };
    function resumePluginConnection(){
      try{
        var saved=sessionStorage.getItem('pitchPluginReturn'); if(!saved) return false;
        sessionStorage.removeItem('pitchPluginReturn'); var pending=JSON.parse(saved);
        if(!pending||typeof pending.createdAt!=='number'||Date.now()-pending.createdAt>600000) return false;
        location.assign(pending.id?'/oauth/consent?authorization_id='+encodeURIComponent(pending.id):'/connections'); return true;
      }catch(e){return false}
    }
    async function initializeAuth(){
      if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase){setSignedOut();showError('Google sign-in is not configured yet.');return}
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{flowType:'implicit',persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
      client.auth.onAuthStateChange(function(_event, next){ if(next){ if(resumePluginConnection())return; setSignedIn(next); void loadProfile(next);} else setSignedOut(); });
      var result=await client.auth.getSession();
      var next=result&&result.data?result.data.session:null;
      if(next){ if(resumePluginConnection())return; setSignedIn(next); await loadProfile(next);} else setSignedOut();
    }
    el('googleBtn').onclick=async function(){
      clearError(); if(!client){showError('Google sign-in is still loading.');return}
      this.disabled=true;
      try{ var result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:cfg.appBaseUrl}}); if(result.error) throw result.error; }
      catch(e){ this.disabled=false; showError(e.message||String(e)); }
    };
    el('signOutBtn').onclick=async function(){ if(client) await client.auth.signOut(); setSignedOut(); location.href='/'; };
    el('refreshAccount').onclick=function(){ if(session) void loadProfile(session); };
    document.querySelectorAll('.checkout').forEach(function(btn){
      btn.onclick=async function(){
        clearError();
        if(!token){showError('Sign in with Google first, then choose your plan.');return}
        if(isPro||!profileReady){showError('Refresh your subscription status before starting checkout.');return}
        btn.disabled=true;
        try{
          var r=await fetch('/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({plan:btn.getAttribute('data-plan')})});
          var data=await r.json(); if(!r.ok) throw Error(data.error||'Unable to start checkout');
          location.href=data.url;
        }catch(e){showError(e.message||String(e)); btn.disabled=false}
      };
    });
    var checkout=new URLSearchParams(location.search).get('checkout');
    if(checkout==='success') showNotice('Checkout completed. Your subscription is being confirmed.');
    if(checkout==='cancelled') showError('Checkout was cancelled. No changes were made.');
    initializeAuth();
  })();
  </script>
</body></html>`;
}
