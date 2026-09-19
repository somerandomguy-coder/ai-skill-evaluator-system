/**
 * Fetch a job description from a URL — SSRF-hardened, because the SERVER makes
 * the request on behalf of an anonymous-ish user.
 *
 * Defences:
 *  - http/https only, default ports only, no credentials in the URL;
 *  - every hostname is resolved and EVERY resulting address must be public. The
 *    check runs inside the socket's own `lookup`, so the address that was
 *    validated is the address that is connected to (no DNS-rebinding window);
 *  - redirects are followed manually (max 3) and each hop is re-validated;
 *  - a hard timeout and a response-size cap; only text-like content types.
 *
 * Text extraction prefers schema.org JobPosting JSON-LD (most careers pages
 * embed it) and falls back to stripping the page's markup.
 */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export class FetchJdError extends Error {}

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPublicAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 169 && b === 254) return false; // link-local, cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a >= 224) return false; // multicast + reserved
    return true;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPublicAddress(mapped[1]);
    if (/^f[cd]/.test(v)) return false; // unique local fc00::/7
    if (/^fe[89ab]/.test(v)) return false; // link-local fe80::/10
    if (v.startsWith("ff")) return false; // multicast
    return true;
  }
  return false;
}

function assertAllowedUrl(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchJdError("Only http and https links are supported.");
  if (u.username || u.password) throw new FetchJdError("Links containing credentials are not supported.");
  if (u.port && u.port !== (u.protocol === "https:" ? "443" : "80")) throw new FetchJdError("Only standard ports are supported.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchJdError("That address is not a public website.");
  }
  if (net.isIP(host.replace(/^\[|\]$/g, "")) && !isPublicAddress(host.replace(/^\[|\]$/g, ""))) {
    throw new FetchJdError("That address is not a public website.");
  }
}

/** A dns lookup that refuses non-public results. Used as the socket's `lookup`. */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || !list.every((a) => isPublicAddress(a.address))) {
      return callback(new FetchJdError("That address is not a public website.") as NodeJS.ErrnoException, "", 4);
    }
    const first = list[0];
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    return callback(null, first.address, first.family);
  });
};

function requestOnce(u: URL): Promise<{ status: number; location?: string; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      u,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { "user-agent": "work-sample-assessment/1.0 (+job description import)", accept: "text/html,text/plain;q=0.9,*/*;q=0.1" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const type = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, type, body: Buffer.alloc(0) });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            req.destroy(new FetchJdError("That page is too large."));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => resolve({ status, type, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new FetchJdError("The page took too long to respond.")));
    req.on("error", (e) => reject(e instanceof FetchJdError ? e : new FetchJdError(e.message.includes("public website") ? "That address is not a public website." : "Could not fetch that page.")));
    req.end();
  });
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ndash: "-", mdash: "-", hellip: "..." };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|h[1-6]|ul|ol|li|section|article|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** schema.org JobPosting embedded as JSON-LD, if the page has one. */
export function jobPostingFromJsonLd(html: string): string | null {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes: unknown[] = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.["@graph"]) ? data["@graph"] : [])];
      for (const n of nodes) {
        const o = n as { "@type"?: string | string[]; title?: string; description?: string; hiringOrganization?: { name?: string } };
        const types = ([] as string[]).concat(o?.["@type"] ?? []);
        if (types.includes("JobPosting") && o.description) {
          const head = [o.title, o.hiringOrganization?.name].filter(Boolean).join(" — ");
          return `${head}\n\n${htmlToText(o.description)}`.trim();
        }
      }
    } catch {
      /* not valid JSON-LD: ignore */
    }
  }
  return null;
}

export async function fetchJobText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new FetchJdError("That does not look like a valid link.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowedUrl(url);
    const res = await requestOnce(url);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new FetchJdError(`The page returned HTTP ${res.status}.`);
    if (!/text\/|application\/xhtml/i.test(res.type)) throw new FetchJdError("That link is not a web page or text document.");
    const html = res.body.toString("utf8");
    const text = /text\/plain/i.test(res.type) ? html : (jobPostingFromJsonLd(html) ?? htmlToText(html));
    if (text.length < 80) {
      throw new FetchJdError("Could not read a job description from that page (it may need JavaScript). Paste the text instead.");
    }
    return text;
  }
  throw new FetchJdError("Too many redirects.");
}
