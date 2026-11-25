/**
 * verify-hybrid.ts — PQ Checker
 *
 * Reads one transaction back from the public QoreChain REST endpoint and
 * reports whether the chain verified it as a *hybrid* post-quantum
 * transaction, i.e. signed with BOTH a classical secp256k1 key and a
 * post-quantum ML-DSA-87 key (NIST FIPS 204).
 *
 * The proof this looks for is exactly what the chain itself publishes:
 *   1. `tx_response.code` is 0 (the transaction succeeded).
 *   2. A `PQCHybridSignature` extension is present in the transaction
 *      (it carries the ML-DSA-87 signature, 4,627 bytes, next to the
 *      64-byte secp256k1 signature).
 *   3. An event of type `pqc_hybrid_verify` with attribute
 *      `status` = `verified` (the validators checked both signatures).
 *
 * Usage:
 *   pnpm verify <TX_HASH>            # testnet by default
 *   QORE_NETWORK=mainnet pnpm verify <TX_HASH>
 *
 * No account, key or funds are needed: this is a read-only check that
 * anyone can rerun, which is the point — the proof is public.
 */

const NETWORKS: Record<string, { rest: string; explorer: string }> = {
  testnet: {
    rest: "https://api-testnet.qore.host",
    explorer: "https://explore.qore.network",
  },
  mainnet: {
    rest: "https://api.qore.host",
    explorer: "https://explore.qore.network",
  },
};

type Json = unknown;

/** Recursively collect every value whose key or @type mentions `needle`. */
function findMentions(node: Json, needle: string, hits: Json[] = []): Json[] {
  if (node === null || typeof node !== "object") return hits;
  if (Array.isArray(node)) {
    for (const item of node) findMentions(item, needle, hits);
    return hits;
  }
  const obj = node as Record<string, Json>;
  const type = typeof obj["@type"] === "string" ? (obj["@type"] as string) : "";
  if (type.includes(needle)) hits.push(node);
  for (const [key, value] of Object.entries(obj)) {
    if (key.includes(needle) && typeof value === "string") hits.push(value);
    findMentions(value, needle, hits);
  }
  return hits;
}

/** Best-effort byte length of a base64 string found inside a hit. */
function base64ByteLength(value: Json): number | null {
  if (typeof value === "string" && /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100) {
    try {
      return Buffer.from(value, "base64").length;
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, Json>)) {
      const n = base64ByteLength(v);
      if (n !== null) return n;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const hash = process.argv[2];
  if (!hash) {
    console.error("usage: pnpm verify <TX_HASH>");
    process.exit(2);
  }
  const networkName = (process.env.QORE_NETWORK ?? "testnet").toLowerCase();
  const net = { ...(NETWORKS[networkName] ?? NETWORKS.testnet) };
  // Optional override, e.g. a self-hosted node: QORE_REST_URL=http://localhost:1317
  if (process.env.QORE_REST_URL) net.rest = process.env.QORE_REST_URL;

  const url = `${net.rest}/cosmos/tx/v1beta1/txs/${hash}`;
  const res = await fetch(url);
  if (res.status === 404) {
    console.log(`Transaction ${hash} not found on ${networkName} (yet).`);
    console.log("If you just sent it, wait ~10 seconds and run this again.");
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`REST endpoint answered HTTP ${res.status} for ${url}`);
    process.exit(1);
  }

  const data = (await res.json()) as Record<string, Json>;
  const txResponse = (data.tx_response ?? {}) as Record<string, Json>;
  const code = txResponse.code;
  const height = txResponse.height;

  const events = Array.isArray(txResponse.events) ? txResponse.events : [];
  const verifyEvent = events.find(
    (e) => (e as Record<string, Json>).type === "pqc_hybrid_verify",
  ) as Record<string, Json> | undefined;
  let verifyStatus: string | null = null;
  if (verifyEvent && Array.isArray(verifyEvent.attributes)) {
    for (const attr of verifyEvent.attributes as Record<string, Json>[]) {
      if (attr.key === "status") verifyStatus = String(attr.value);
    }
  }

  const pqcHits = findMentions(data, "PQCHybridSignature");
  let signatureBytes: number | null = null;
  for (const hit of pqcHits) {
    signatureBytes = base64ByteLength(hit);
    if (signatureBytes !== null) break;
  }

  const hybrid = pqcHits.length > 0;
  const verified = hybrid && verifyStatus === "verified" && code === 0;

  console.log(`transaction : ${hash}`);
  console.log(`network     : ${networkName}${height ? ` (block ${height})` : ""}`);
  console.log(`tx code     : ${code} ${code === 0 ? "(success)" : "(FAILED)"}`);
  console.log(
    `hybrid ext  : ${hybrid ? `PQCHybridSignature present${signatureBytes ? `, ML-DSA-87 signature ~${signatureBytes} bytes` : ""}` : "not present — classical signature only"}`,
  );
  console.log(
    `chain event : ${verifyEvent ? `pqc_hybrid_verify, status = ${verifyStatus}` : "no pqc_hybrid_verify event"}`,
  );
  console.log(`explorer    : ${net.explorer} (switch to ${networkName === "testnet" ? "Testnet" : "Mainnet"}, search the hash)`);
  console.log(
    verified
      ? "\nVERDICT: HYBRID VERIFIED — the validators checked BOTH the secp256k1 and the ML-DSA-87 signature."
      : "\nVERDICT: NOT a verified hybrid transaction (see lines above).",
  );
  process.exit(verified ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
