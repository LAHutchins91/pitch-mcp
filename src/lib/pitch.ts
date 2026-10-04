export type PitchRecord = {
  id: string;
  kind: string;
  title: string;
  status: "LOCKED" | "DEVELOPING" | "UNKNOWN" | "RETIRED";
  content: string;
  tags: string[];
  customerName: string | null;
};

const tokenize = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9']+/g) ?? []);

/** What a sales assistant must not invent. Absence from the locked record means not approved. */
export const FORBIDDEN_TO_INVENT = [
  "A metric that is not a locked approved metric",
  "A customer name the owner did not record",
  "A discount the owner did not approve",
  "Any discount when a locked rule says no discount is approved"
] as const;

export function rankApprovedFacts(query: string, entries: PitchRecord[], limit = 20): PitchRecord[] {
  const words = tokenize(query);
  return entries
    .filter((entry) => entry.status !== "RETIRED")
    .map((entry, index) => {
      const hay = tokenize(`${entry.title} ${entry.kind} ${entry.tags.join(" ")} ${entry.content} ${entry.customerName ?? ""}`);
      let score = entry.status === "LOCKED" ? 4 : entry.status === "DEVELOPING" ? 2 : 0;
      for (const token of words) if (hay.has(token)) score += 3;
      if (query.toLowerCase().includes(entry.title.toLowerCase())) score += 10;
      if (entry.kind === "NO_DISCOUNT" && entry.status === "LOCKED") score += 4;
      if (entry.kind === "METRIC" && entry.status === "LOCKED") score += 3;
      if (entry.kind === "DISCOUNT" && entry.status === "LOCKED") score += 2;
      if (entry.kind === "CUSTOMER_PROOF" && entry.status === "LOCKED") score += 2;
      return { entry, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.entry);
}

function recordedName(name: string | null) {
  const trimmed = name?.trim() ?? "";
  return trimmed ? trimmed : null;
}

/** Mark a stored fact so a caller can see whether it is approved to say. */
export function presentFact(entry: PitchRecord) {
  const approved = entry.status === "LOCKED";
  const name = recordedName(entry.customerName);
  const base = {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    status: entry.status,
    content: entry.content,
    tags: entry.tags,
    approved_to_say: approved,
    not_approved: approved ? null : "This fact is not approved."
  };
  if (entry.kind === "CUSTOMER_PROOF") {
    return {
      ...base,
      customer_name: name,
      customer_name_approved: approved && Boolean(name),
      customer_name_notice: name ? null : "Customer name is not approved."
    };
  }
  if (entry.kind === "NO_DISCOUNT") {
    return {
      ...base,
      discount_approved: false,
      discount_notice: "No discount is approved."
    };
  }
  if (entry.kind === "DISCOUNT") {
    return {
      ...base,
      discount_approved: approved,
      discount_notice: approved ? null : "This discount is not approved."
    };
  }
  return {
    ...base,
    metric_approved: approved && entry.kind === "METRIC",
    metric_notice: approved ? null : "This metric is not approved."
  };
}

/** Say what is not approved, instead of leaving a gap the assistant might fill. */
export function approvalBoundary(entries: PitchRecord[]) {
  const active = entries.filter((entry) => entry.status !== "RETIRED");
  const locked = active.filter((entry) => entry.status === "LOCKED");
  const metrics = locked.filter((entry) => entry.kind === "METRIC");
  const proofs = locked.filter((entry) => entry.kind === "CUSTOMER_PROOF");
  const named = proofs.filter((entry) => recordedName(entry.customerName));
  const unnamed = proofs.filter((entry) => !recordedName(entry.customerName));
  const discount = locked.find((entry) => entry.kind === "DISCOUNT");
  const noDiscount = locked.find((entry) => entry.kind === "NO_DISCOUNT");
  const statements: string[] = [];
  if (metrics.length === 0) statements.push("No metric is approved.");
  else statements.push("A metric that is not a locked approved metric is not approved.");
  if (proofs.length === 0) statements.push("No customer proof is approved. Do not invent a customer name.");
  if (unnamed.length) statements.push(`Customer name is not approved for: ${unnamed.map((entry) => entry.title).join(", ")}.`);
  statements.push("A customer name the owner did not record is not approved.");
  let discountRule: { approved: false; rule: string } | { approved: true; terms: string; title: string };
  if (noDiscount) {
    statements.push("No discount is approved.");
    discountRule = { approved: false, rule: "No discount is approved." };
  } else if (!discount) {
    statements.push("A discount is not approved.");
    discountRule = { approved: false, rule: "A discount is not approved." };
  } else {
    statements.push("Only the recorded discount is approved. Any other discount is not approved.");
    discountRule = { approved: true, terms: discount.content, title: discount.title };
  }
  if (active.some((entry) => entry.status !== "LOCKED")) statements.push("Facts that are not LOCKED are not approved to say.");
  return {
    forbidden_to_invent: [...FORBIDDEN_TO_INVENT],
    not_approved: statements,
    approved_metric_titles: metrics.map((entry) => entry.title),
    approved_customer_names: named.map((entry) => recordedName(entry.customerName) as string),
    customer_names_not_approved: unnamed.map((entry) => entry.title),
    discount: discountRule
  };
}
