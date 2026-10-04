/** Public connect copy uses the configured app base. Pitch has no separate marketing host. */
export function canonicalPublicOrigin(appBaseUrl: string) {
  return appBaseUrl.replace(/\/$/, "");
}

/** No earlier production host to mention. Other bases stay silent. */
export function legacyMcpUrl(_appBaseUrl: string): string | null {
  return null;
}
