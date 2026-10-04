import crypto from "node:crypto";
import express, { type Request } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { installPluginAuth } from "./plugin-auth.js";
import { installPublicPages, page } from "./public-pages.js";
import { createPitchServer } from "./pitch-tools.js";
import { validateMcpClaims } from "./mcp-claims.js";
import { MCP_CORS_HEADERS, mcpBrowserOriginAllowed } from "./mcp-clients.js";
import { renderLanding } from "./landing-page.js";

export const app = express();
export default app;
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store"
  });
  next();
});

const publicLimits = new Map<string, { count: number; end: number }>();
function allowPublic(key: string, limit: number, ms: number) {
  const now = Date.now();
  for (const [storedKey, value] of publicLimits) if (value.end <= now) publicLimits.delete(storedKey);
  const value = publicLimits.get(key);
  if (value) {
    value.count++;
    return value.count <= limit;
  }
  if (publicLimits.size >= 10000) return false;
  publicLimits.set(key, { count: 1, end: now + ms });
  return true;
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? "";
const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY ?? "";
const APP_BASE_URL = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

type AuthUser = { id: string; email?: string };
type JsonObject = Record<string, unknown>;

function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function supabaseRequest<T>(path: string, options: RequestInit = {}, accessToken?: string, serviceRole = false): Promise<T> {
  const base = requireEnv("SUPABASE_URL", SUPABASE_URL);
  const key = serviceRole
    ? requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY)
    : requireEnv("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
  const headers = new Headers(options.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${accessToken ?? key}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...options, headers, signal: options.signal ?? AbortSignal.timeout(20000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
  return (text ? JSON.parse(text) : null) as T;
}

function bearer(req: Request) {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function authenticatedUser(req: Request): Promise<{ user: AuthUser; token: string }> {
  const token = bearer(req);
  if (!token) throw new Error("Authentication required");
  const user = await supabaseRequest<AuthUser>("/auth/v1/user", { method: "GET" }, token);
  if (!user?.id) throw new Error("Invalid authentication token");
  return { user, token };
}

async function stripeRequest<T>(path: string, params: URLSearchParams): Promise<T> {
  const secret = requireEnv("STRIPE_SECRET_KEY", STRIPE_SECRET_KEY);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!response.ok) throw new Error(`Stripe ${response.status}`);
  return JSON.parse(await response.text()) as T;
}

function stripeEvent(rawBody: Buffer, signatureHeader: string) {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET);
  const fields = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = fields.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = fields.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) throw new Error("Malformed Stripe signature");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Expired Stripe signature");
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const valid = signatures.some((signature) => {
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  });
  if (!valid) throw new Error("Invalid Stripe signature");
  return JSON.parse(rawBody.toString("utf8")) as { type: string; data: { object: JsonObject } };
}

async function updateBillingProfile(userId: string, patch: JsonObject) {
  await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  }, undefined, true);
}

app.post("/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.header("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) return res.status(400).send("Missing Stripe signature");
    const event = stripeEvent(req.body, signature);
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const userId = typeof object.client_reference_id === "string" ? object.client_reference_id : undefined;
      if (userId) {
        await updateBillingProfile(userId, {
          stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
          stripe_subscription_id: typeof object.subscription === "string" ? object.subscription : null
        });
      }
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const metadata = (object.metadata ?? {}) as JsonObject;
      const userId = typeof metadata.supabase_user_id === "string" ? metadata.supabase_user_id : undefined;
      if (userId) {
        const status = typeof object.status === "string" ? object.status : "unknown";
        const periodEnd = typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : null;
        const priceId = (((object.items as JsonObject | undefined)?.data as JsonObject[] | undefined)?.[0]?.price as JsonObject | undefined)?.id;
        const plan = priceId === STRIPE_PRICE_YEARLY ? "annual" : ["active", "trialing"].includes(status) ? "pro" : "trial";
        await updateBillingProfile(userId, {
          plan,
          stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
          stripe_subscription_id: typeof object.id === "string" ? object.id : null,
          subscription_status: status,
          current_period_end: periodEnd,
          cancel_at_period_end: Boolean(object.cancel_at_period_end)
        });
      }
    }

    res.json({ received: true });
  } catch {
    console.error("Stripe webhook request failed");
    res.status(400).send("Webhook could not be processed");
  }
});

app.use(express.json({ limit: "128kb" }));
installPublicPages(app, APP_BASE_URL);

app.get("/.well-known/openai-apps-challenge", (_req, res) => {
  const token = process.env.OPENAI_APPS_CHALLENGE;
  if (!token) return res.status(404).type("text").send("Verification is not configured.");
  res.type("text").send(token);
});

app.post("/api/support", async (req, res) => {
  if (!allowPublic(`support:${req.ip}`, 5, 3600000)) return res.status(429).json({ error: "Too many requests. Please try again in an hour." });
  const input = z.object({ email: z.string().email().max(254), message: z.string().trim().min(10).max(4000) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: "Enter a valid reply email and a message of 10–4000 characters." });
  try {
    const rows = await supabaseRequest<Array<{ id: string }>>("/rest/v1/pitch_support_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(input.data)
    }, undefined, true);
    res.json({ id: rows[0].id });
  } catch {
    res.status(503).json({ error: "Support could not receive your request. Please retry later." });
  }
});

app.get("/data", (_req, res) => {
  const config = JSON.stringify({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY }).replace(/</g, "\\u003c");
  res.type("html").send(page("Your data, your choice", `<p>Export a complete product archive or permanently delete a product and its metrics, customer proof, discount rules, and revision history. These controls remain available after Pro expires.</p><p><a href="/app">Sign in first</a>. <a href="/connections">Disconnect applications</a> separately. Manage cancellation in your account’s billing portal. For full account deletion or privacy requests, <a href="/support">contact support</a>.</p><section><label>Product<select id="products"></select></label><button id="export">Download complete JSON archive</button><label>To delete, type the exact product name<input id="confirm" autocomplete="off"></label><button id="delete">Permanently delete product</button><p id="message" role="status"></p></section><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js"></script><script>(async function(){var cfg=${config},client=window.supabase.createClient(cfg.url,cfg.key),status=document.getElementById('message'),select=document.getElementById('products');async function rpc(name,args){var session=await client.auth.getSession();if(!session.data.session)throw Error('Sign in to Pitch first.');var r=await fetch(cfg.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+session.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error('Request could not complete. Refresh and retry.');return r.json()}async function load(){var rows=await rpc('list_pitch_owned_products',{});select.replaceChildren();rows.forEach(function(p){select.add(new Option(p.name,p.id))});if(!rows.length)status.textContent='No products to export or delete.'}document.getElementById('export').onclick=async function(){this.disabled=true;try{if(!select.value)throw Error('Choose a product first.');var data=await rpc('export_pitch_product',{p_product:select.value}),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pitch-product.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000);status.textContent='Complete archive downloaded.'}catch(e){status.textContent=e.message}finally{this.disabled=false}};document.getElementById('delete').onclick=async function(){this.disabled=true;try{if(!select.value)throw Error('Choose a product first.');if(document.getElementById('confirm').value!==select.selectedOptions[0].textContent)throw Error('Type the exact product name to confirm deletion.');var done=await rpc('delete_pitch_product',{p_product:select.value,p_confirmation:document.getElementById('confirm').value});if(!done)throw Error('Product was not deleted. Refresh and retry.');document.getElementById('confirm').value='';await load();status.textContent='Product and associated sales facts deleted.'}catch(e){status.textContent=e.message}finally{this.disabled=false}};try{await load()}catch(e){status.textContent=e.message}})();</script>`));
});

installPluginAuth(app, APP_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY);

app.get(["/", "/app"], (_req, res) => {
  res.type("html").send(renderLanding(APP_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY));
});

app.get("/health", (_req, res) => res.json({
  ok: true,
  service: "pitch",
  version: "0.1.0",
  supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
  stripeSecretConfigured: Boolean(STRIPE_SECRET_KEY),
  stripeMonthlyConfigured: Boolean(STRIPE_PRICE_MONTHLY),
  stripeYearlyConfigured: Boolean(STRIPE_PRICE_YEARLY),
  billingConfigured: Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_MONTHLY && STRIPE_PRICE_YEARLY)
}));

app.post("/billing/checkout", async (req, res) => {
  try {
    const { user } = await authenticatedUser(req);
    const plan = req.body?.plan === "annual" ? "annual" : "monthly";
    const price = plan === "annual"
      ? requireEnv("STRIPE_PRICE_YEARLY", STRIPE_PRICE_YEARLY)
      : requireEnv("STRIPE_PRICE_MONTHLY", STRIPE_PRICE_MONTHLY);
    const profiles = await supabaseRequest<Array<{ stripe_customer_id?: string | null }>>(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id`,
      { method: "GET" },
      bearer(req)
    );
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("line_items[0][price]", price);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", user.id);
    params.set("metadata[supabase_user_id]", user.id);
    params.set("subscription_data[metadata][supabase_user_id]", user.id);
    params.set("subscription_data[trial_period_days]", "14");
    params.set("payment_method_collection", "always");
    params.set("success_url", `${APP_BASE_URL}/?checkout=success`);
    params.set("cancel_url", `${APP_BASE_URL}/?checkout=cancelled`);
    const customerId = profiles[0]?.stripe_customer_id;
    if (customerId) params.set("customer", customerId);
    else if (user.email) params.set("customer_email", user.email);
    const session = await stripeRequest<{ id: string; url: string }>("checkout/sessions", params);
    res.json({ id: session.id, url: session.url });
  } catch {
    res.status(400).json({ error: "Unable to create checkout. Verify sign-in and retry." });
  }
});

app.post("/billing/portal", async (req, res) => {
  try {
    const { user } = await authenticatedUser(req);
    const profiles = await supabaseRequest<Array<{ stripe_customer_id?: string | null }>>(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id`,
      { method: "GET" },
      bearer(req)
    );
    const customer = profiles[0]?.stripe_customer_id;
    if (!customer) return res.status(400).json({ error: "No billing customer exists for this account yet" });
    const params = new URLSearchParams({ customer, return_url: APP_BASE_URL });
    const session = await stripeRequest<{ url: string }>("billing_portal/sessions", params);
    res.json({ url: session.url });
  } catch {
    res.status(400).json({ error: "Unable to open billing management. Verify sign-in and retry." });
  }
});

function createMcpServer(token: string, userId: string) {
  return createPitchServer(<T>(path: string, options?: RequestInit) => supabaseRequest<T>(path, options, token), userId);
}

function guardMcpOrigin(req: Request, res: express.Response) {
  const origin = req.header("origin");
  if (!mcpBrowserOriginAllowed(origin, APP_BASE_URL)) {
    res.status(403).json({ error: "Origin is not allowed." });
    return false;
  }
  if (origin) res.set({ ...MCP_CORS_HEADERS, "Access-Control-Allow-Origin": origin, Vary: "Origin" });
  return true;
}

app.options("/mcp", (req, res) => {
  if (!guardMcpOrigin(req, res)) return;
  res.status(204).end();
});

app.post("/mcp", async (req, res) => {
  if (!guardMcpOrigin(req, res)) return;
  if (!allowPublic(`mcp:${req.ip}`, 300, 60000)) return res.status(429).set("Retry-After", "60").json({ error: "Too many requests. Retry in one minute." });
  let server: McpServer | undefined;
  let token = "";
  let userId = "";
  // Tool discovery contains only schemas. All tool execution requires a verified subscriber.
  const publicMethods = new Set(["initialize", "notifications/initialized", "tools/list", "ping"]);
  if (!publicMethods.has(req.body?.method)) {
    try {
      const auth = await authenticatedUser(req);
      validateMcpClaims(auth.token, auth.user.id, `${SUPABASE_URL}/auth/v1`, `${APP_BASE_URL}/mcp`);
      if (!await supabaseRequest<boolean>("/rest/v1/rpc/verify_pitch_connection", { method: "POST", body: "{}" }, auth.token)) throw Error("Connection revoked");
      token = auth.token;
      userId = auth.user.id;
    } catch {
      res.set("WWW-Authenticate", `Bearer resource_metadata="${APP_BASE_URL}/.well-known/oauth-protected-resource/mcp"`);
      return res.status(401).json({ error: "Sign in to Pitch to use sales tools." });
    }
    try {
      const profiles = await supabaseRequest<Array<{ subscription_status: string }>>(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=subscription_status`,
        {},
        token
      );
      if (!profiles[0] || !["active", "trialing"].includes(profiles[0].subscription_status)) {
        return res.status(403).json({
          error: "A Pitch Pro subscription or active trial is required.",
          access_information: `${APP_BASE_URL}/access`
        });
      }
    } catch {
      return res.status(503).json({ error: "Could not verify your subscription. Please retry." });
    }
  }
  try {
    if (userId) {
      const allowed = await supabaseRequest<boolean>("/rest/v1/rpc/consume_pitch_request", {
        method: "POST",
        body: JSON.stringify({ p_user: userId })
      }, undefined, true);
      if (!allowed) return res.status(429).set("Retry-After", "60").json({ error: "Sales tool limit reached. Retry in one minute." });
    }
    server = createMcpServer(token, userId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      void transport.close();
      void server?.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    if (!res.headersSent) res.status(500).json({ error: "Unable to process the plugin request." });
  }
});

app.get("/mcp", (req, res) => {
  if (!guardMcpOrigin(req, res)) return;
  res.set("WWW-Authenticate", `Bearer resource_metadata="${APP_BASE_URL}/.well-known/oauth-protected-resource/mcp"`);
  res.status(401).json({ error: "Use Streamable HTTP POST with your Pitch connection." });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const tooLarge = typeof error === "object" && error !== null && "type" in error && (error as { type?: string }).type === "entity.too.large";
  res.status(tooLarge ? 413 : 400).json({ error: "Invalid or oversized request." });
});

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  // A terminal keeps the HTTP listener only. A non-terminal stdin speaks MCP there.
  const stdio = process.stdin.isTTY !== true;
  app.listen(port, () => {
    const line = `Pitch listening on ${port}`;
    if (stdio) console.error(line);
    else console.log(line);
  });
  if (stdio) {
    const stdioServer = createMcpServer("", "");
    await stdioServer.connect(new StdioServerTransport());
  }
}
