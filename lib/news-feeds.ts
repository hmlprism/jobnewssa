// lib/news-feeds.ts
//
// RSS feed definitions, XML parser, and employment-relevance filter.
// Consumed server-side by /api/news/ingest — not for use in client components.

// ─── Feed definitions ─────────────────────────────────────────────────────────

export interface FeedConfig {
  url: string;
  sourceName: string;
}

// Only confirmed-live feeds are listed here. Feeds were verified 2026-09-11:
// 403/Cloudflare-blocked: BusinessTech, News24, Citizen
// 404/dead: TimesLive, EWN
export const RSS_FEEDS: FeedConfig[] = [
  { url: "https://www.dailymaverick.co.za/dmrss/", sourceName: "Daily Maverick" },
  { url: "https://www.moneyweb.co.za/feed/", sourceName: "Moneyweb" },
  { url: "https://www.iol.co.za/rss", sourceName: "IOL" },
];

// ─── Employment-relevance filter ──────────────────────────────────────────────
//
// Applied case-insensitively as substring match against title + description.
// Focused to catch genuine labour-market signal while filtering out sport,
// celebrity, food, and environmental stories. Deliberately excludes bare words
// like "union" (too common in non-labour contexts) and "strike" (cricket).

const EMPLOYMENT_KEYWORDS = [
  // Unemployment & job loss
  "unemploy",         // unemployment, unemployed, unemployable
  "retrench",         // retrenchment, retrenching, retrenched
  "redundan",         // redundancy, redundancies
  "layoff", "lay-off", "lay off",
  "job cut", "job loss", "job creation", "job market",
  "mass dismissal",
  "plant closure", "factory closure", "mine closure",
  "business rescue",  // SA formal insolvency procedure — strong job-risk signal
  "liquidation",
  "restructur",       // restructuring, restructure

  // Active hiring
  "vacancy", "vacancies",
  "recruit",          // recruitment, recruiting
  "hiring freeze", "new jobs",

  // Industrial relations
  "strike action", "industrial action", "work stoppage", "go-slow",
  "labour dispute", "labor dispute", "wage dispute",
  "collective bargaining", "bargaining council",
  "ccma",             // Commission for Conciliation, Mediation and Arbitration
  "cosatu",           // Congress of South African Trade Unions
  "saftu",            // South African Federation of Trade Unions
  "numsa",            // National Union of Metalworkers SA

  // Wages & pay
  "minimum wage", "national minimum wage",
  "wage increase", "wage cut", "wage freeze",
  "pay rise", "pay cut", "pay freeze",
  "salary increase", "salary cut",
  "uif",              // Unemployment Insurance Fund

  // SA-specific employment programmes & data
  "learnership",
  "youth unemployment", "youth employment",
  "employment equity",
  "unemployment rate", "employment rate",
  "labour force survey",
  "epwp",             // Expanded Public Works Programme
  "seta",             // Sector Education and Training Authority

  // Work modality
  "remote work", "work from home", "hybrid work",

  // Load shedding — affects business operations and employment decisions
  "load shedding",
] as const;

export function isEmploymentRelevant(title: string, description: string): boolean {
  const haystack = `${title} ${description}`.toLowerCase();
  return EMPLOYMENT_KEYWORDS.some((kw) => haystack.includes(kw));
}

// ─── RSS parser ───────────────────────────────────────────────────────────────

export interface ParsedItem {
  title: string;
  summary: string;    // short excerpt from the feed's own description — never scraped
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string; // ISO 8601
  category: string | null;
}

/** Extract text content of a simple RSS element, handling optional CDATA wrapper. */
function extractText(xml: string, tag: string): string | null {
  // CDATA: <tag><![CDATA[...]]></tag>
  const cdataM = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  ).exec(xml);
  if (cdataM) return cdataM[1].trim();
  // Plain text: <tag>...</tag> (no nested tags — use [^<]* to stop at child elements)
  const plainM = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i").exec(xml);
  if (plainM) return plainM[1].trim();
  return null;
}

/** Strip HTML tags and decode common HTML entities. */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse all <item> elements from an RSS 2.0 feed XML string. */
export function parseRssFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const itemRx = /<item[\s>]([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRx.exec(xml)) !== null) {
    const inner = m[1];

    const rawTitle = extractText(inner, "title");
    const link = extractText(inner, "link");
    if (!rawTitle || !link) continue;

    const title = stripHtml(rawTitle);

    // Use feed's own description as the snippet — never more than 500 chars.
    // This is from the feed itself, not scraped from the article body.
    const rawDescription = extractText(inner, "description") ?? "";
    const summary = stripHtml(rawDescription).slice(0, 500);

    // pubDate: RFC 822 — parseable by Date constructor in V8. Fall back to now().
    const pubDateStr = extractText(inner, "pubDate");
    let publishedAt: string;
    if (pubDateStr) {
      const d = new Date(pubDateStr);
      publishedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }

    // Image: try <enclosure type="image/..." url="..."> (Daily Maverick style)
    // then <media:content url="..."> (IOL style)
    let imageUrl: string | null = null;
    const encM =
      /<enclosure[^>]+type="image\/[^"]*"[^>]+url="([^"]+)"/i.exec(inner) ??
      /<enclosure[^>]+url="([^"]+)"[^>]+type="image\/[^"]*"/i.exec(inner);
    if (encM) {
      imageUrl = encM[1];
    } else {
      const mediaM = /<media:content[^>]+url="([^"]+)"/i.exec(inner);
      if (mediaM) imageUrl = mediaM[1];
    }

    const category = extractText(inner, "category");

    items.push({ title, summary, sourceUrl: link, imageUrl, publishedAt, category });
  }

  return items;
}
