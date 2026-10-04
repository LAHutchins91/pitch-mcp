import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approvalBoundary, presentFact, rankApprovedFacts } from "../src/lib/pitch.js";
import { validateMcpClaims } from "../src/mcp-claims.js";
import { connectPageBody } from "../src/connect-page.js";
import { selectApproved } from "../src/pitch-tools.js";

const toolNames = [
  "list_products",
  "create_product",
  "get_approved_context",
  "search_approved_facts",
  "record_approved_metric",
  "record_customer_proof",
  "record_discount_rule",
  "revise_approved_fact",
  "get_fact_history",
  "pitch_audit"
];

describe("selectApproved", () => {
  it("prefers a locked no-discount rule that matches the request", () => {
    const rows = [
      { id: "1", kind: "METRIC", title: "Cycle time", status: "DEVELOPING", content: "discount conversations take longer", tags: [], customer_name: null },
      { id: "2", kind: "NO_DISCOUNT", title: "No discount", status: "LOCKED", content: "No discount is approved.", tags: ["discount"] },
      { id: "3", kind: "CUSTOMER_PROOF", title: "Retired logo", status: "RETIRED", content: "discount", tags: [], customer_name: "Old Name" }
    ];
    const selected = selectApproved("discount", rows, 2);
    expect(selected.map((row) => row.title)).toEqual(["No discount", "Cycle time"]);
  });
});

describe("rankApprovedFacts", () => {
  it("drops retired facts", () => {
    const ranked = rankApprovedFacts("metric", [
      { id: "1", kind: "METRIC", title: "Old win rate", status: "RETIRED", content: "old", tags: [], customerName: null }
    ]);
    expect(ranked).toEqual([]);
  });
});

describe("approvalBoundary", () => {
  it("says a discount and a customer name are not approved when the owner did not record them", () => {
    const boundary = approvalBoundary([
      { id: "1", kind: "METRIC", title: "Activation", status: "LOCKED", content: "42 percent of trials activate", tags: [], customerName: null },
      { id: "2", kind: "CUSTOMER_PROOF", title: "Rollout", status: "LOCKED", content: "Went live in one quarter", tags: [], customerName: null }
    ]);
    expect(boundary.discount).toEqual({ approved: false, rule: "A discount is not approved." });
    expect(boundary.customer_names_not_approved).toEqual(["Rollout"]);
    expect(boundary.approved_customer_names).toEqual([]);
    expect(boundary.not_approved.join(" ")).toMatch(/not approved/);
    expect(boundary.forbidden_to_invent.length).toBeGreaterThan(0);
  });

  it("says no discount is approved when that rule is locked", () => {
    const boundary = approvalBoundary([
      { id: "1", kind: "NO_DISCOUNT", title: "Discount policy", status: "LOCKED", content: "No discount is approved.", tags: [], customerName: null },
      { id: "2", kind: "DISCOUNT", title: "Side offer", status: "DEVELOPING", content: "one extra month", tags: [], customerName: null }
    ]);
    expect(boundary.discount).toEqual({ approved: false, rule: "No discount is approved." });
    expect(boundary.not_approved.join(" ")).toMatch(/Facts that are not LOCKED are not approved to say/);
  });

  it("allows only the recorded discount", () => {
    const boundary = approvalBoundary([
      { id: "1", kind: "DISCOUNT", title: "Annual", status: "LOCKED", content: "One extra month on an annual plan", tags: [], customerName: null }
    ]);
    expect(boundary.discount).toEqual({ approved: true, terms: "One extra month on an annual plan", title: "Annual" });
  });
});

describe("presentFact", () => {
  it("does not treat a developing metric as approved", () => {
    const fact = presentFact({ id: "1", kind: "METRIC", title: "Seats", status: "DEVELOPING", content: "1200", tags: [], customerName: null });
    expect(fact.approved_to_say).toBe(false);
    expect(fact.not_approved).toBe("This fact is not approved.");
  });

  it("keeps a recorded customer name and withholds a missing one", () => {
    const named = presentFact({ id: "1", kind: "CUSTOMER_PROOF", title: "Launch", status: "LOCKED", content: "Launched", tags: [], customerName: "Northwind" });
    const unnamed = presentFact({ id: "2", kind: "CUSTOMER_PROOF", title: "Launch", status: "LOCKED", content: "Launched", tags: [], customerName: null });
    expect(named).toMatchObject({ customer_name: "Northwind", customer_name_approved: true, customer_name_notice: null });
    expect(unnamed).toMatchObject({ customer_name: null, customer_name_approved: false, customer_name_notice: "Customer name is not approved." });
  });
});

describe("validateMcpClaims", () => {
  it("accepts an email-scoped token for this resource", () => {
    const claims = {
      sub: "user-1",
      iss: "https://example.supabase.co/auth/v1",
      aud: "https://pitch.example/mcp",
      role: "authenticated",
      exp: 2_000_000_000,
      client_id: "client",
      session_id: "session",
      scope: "email offline_access"
    };
    const token = `aaa.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
    expect(validateMcpClaims(token, "user-1", claims.iss, "https://pitch.example/mcp", 1_700_000_000).sub).toBe("user-1");
  });

  it("rejects a token that is missing the email scope", () => {
    const claims = {
      sub: "user-1",
      iss: "https://example.supabase.co/auth/v1",
      aud: "https://pitch.example/mcp",
      role: "authenticated",
      exp: 2_000_000_000,
      client_id: "client",
      session_id: "session",
      scope: "openid"
    };
    const token = `aaa.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
    expect(() => validateMcpClaims(token, "user-1", claims.iss, "https://pitch.example/mcp", 1_700_000_000)).toThrow(/Reconnect Pitch/);
  });
});

describe("public copy", () => {
  it("registers the sales tools and explains OAuth without a currency amount", () => {
    const tools = readFileSync("src/pitch-tools.ts", "utf8");
    for (const name of toolNames) expect(tools).toContain(`"${name}"`);
    const connect = connectPageBody("http://localhost:3000");
    expect(connect).toMatch(/dynamic client registration/i);
    expect(connect).toMatch(/OAuth/);
    expect(connect).toMatch(/Do not paste an API key or password into a header/);
    const files = [
      "README.md",
      "src/connect-page.ts",
      "src/landing-page.ts",
      "src/public-pages.ts",
      "src/server.ts",
      "src/pitch-tools.ts",
      "src/plugin-auth.ts"
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\$\d/);
    }
  });
});
