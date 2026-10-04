# Pitch

Pitch keeps approved product facts, proof, and numbers a sales assistant is allowed to say. It stores metrics, customer proof, and discount rules, then lets an assistant read that record before it answers. If a fact is not approved, the tools say so. The assistant does not fill it in.

It works with ChatGPT, Claude, Gemini, Grok, and Cursor, plus any other MCP client that can do Streamable HTTP and OAuth. It is not a ChatGPT-only plugin.

- Source: https://github.com/LAHutchins91/pitch-mcp
- Setup: `http://localhost:3000/connect` on a local server, or `https://<your host>/connect` when deployed
- MCP address: `http://localhost:3000/mcp` locally, or `https://<your host>/mcp` when deployed

Sign in with your Pitch account when the assistant opens OAuth. Do not paste an API key or password into a header. Sales tools need Pro or an active trial. The site offers a 14-day trial, then Pro. Checkout shows the billing terms before you confirm. This page does not invent an amount.

## What the assistant can do

After you approve the connection, the server exposes these tools:

- list_products
- create_product
- get_approved_context
- search_approved_facts
- record_approved_metric
- record_customer_proof
- record_discount_rule
- revise_approved_fact
- get_fact_history
- pitch_audit

Locked facts stay locked until you revise them. A customer name is included only when you recorded it. A discount is either an approved offer or the rule that no discount is approved. The assistant only calls these tools when you and the host allow it.

## Connect

Cursor, in `~/.cursor/mcp.json` or a project `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pitch": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Use your deployed origin plus `/mcp` when the server is public. Claude Code:

```bash
claude mcp add --transport http pitch http://localhost:3000/mcp
```

Other clients: add the same URL, choose OAuth, and leave client id and secret empty. Pitch supports dynamic client registration. Full steps for each assistant are on the connect page.

Registry metadata for this remote server is in `server.json` (`io.github.LAHutchins91/pitch`).

## Run

```bash
npm install
npm run build
npm start
```

Set `APP_BASE_URL` to the public origin when you deploy. Sign-in uses Supabase. Billing uses Stripe, with a 14-day trial on checkout. The process speaks Streamable HTTP when stdin is a terminal, and stdio MCP when it is not.
