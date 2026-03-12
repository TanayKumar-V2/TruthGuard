import { FactCheckMatch, OfficialSourceLink } from "@/lib/analysis-types";

const FACT_CHECK_ENDPOINT =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const SOURCE_FILTERS = [
  { label: "Alt News", site: "altnews.in" },
  { label: "BOOM", site: "boomlive.in" },
  { label: "PIB Fact Check", site: "pib.gov.in" },
  { label: "Vishvas News", site: "vishvasnews.com" },
  { label: "India Today FC", site: "indiatoday.in/fact-check" },
  { label: "Quint WebQoof", site: "thequint.com/news/webqoof" },
  { label: "FactChecker.in", site: "factchecker.in" },
] as const;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const QUERY_PREFIX_PATTERNS = [
  /^(claim|viral claim|viral post|post|message|forwarded message|rumou?r|video|image|headline)\s*[:\-]\s*/i,
  /^(social media posts?|posts?|messages?|viral messages?|users?)\s+(claim|claims|say|says)\s+(that\s+)?/i,
  /^(it is being claimed|it is claimed|people are saying|the post says|the message says|the article says)\s+(that\s+)?/i,
  /^(according to|reports say|reportedly|allegedly)\s+/i,
] as const;

const QUERY_TAIL_SPLIT_PATTERN =
  /\b(?:because|after|while|although|since|if|when|despite|according to|as per|via)\b/i;

const MAX_QUERY_VARIANTS = 4;
const FACT_CHECK_TOTAL_BUDGET_MS = 7000;
const FACT_CHECK_REQUEST_TIMEOUT_MS = 2200;
const SITE_FILTER_VARIANT_LIMIT = 2;

interface ClaimSearchResponse {
  claims?: Array<{
    text?: string;
    claimant?: string;
    claimDate?: string;
    claimReview?: Array<{
      publisher?: {
        name?: string;
        site?: string;
      };
      url?: string;
      title?: string;
      reviewDate?: string;
      textualRating?: string;
      languageCode?: string;
    }>;
  }>;
}

function normalizeSpace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function tokenize(input: string) {
  return normalizeSpace(input)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}

function cleanFactCheckQuery(input: string) {
  return normalizeSpace(
    input
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/["'`]/g, " ")
      .replace(/[,:;|]/g, " "),
  );
}

function stripQueryPrefixes(input: string) {
  let current = input;
  let previous = "";

  while (current !== previous) {
    previous = current;
    for (const pattern of QUERY_PREFIX_PATTERNS) {
      current = current.replace(pattern, "");
    }
    current = normalizeSpace(current);
  }

  return current;
}

function extractCoreClause(input: string) {
  const stripped = stripQueryPrefixes(cleanFactCheckQuery(input));
  const directClause = stripped.match(
    /\b(?:claims?|claimed|says?|said|states?|stated|reported|reports|alleges?|alleged)\s+that\s+(.+)/i,
  )?.[1];
  const base = normalizeSpace(directClause || stripped);

  if (!base) return "";

  const sentence = normalizeSpace(base.split(/(?<=[.!?])\s+/)[0] || base);
  const shortened = normalizeSpace(
    sentence.split(QUERY_TAIL_SPLIT_PATTERN)[0] || sentence,
  );
  return shortened || sentence;
}

function buildKeywordVariant(input: string) {
  const tokens = tokenize(input).slice(0, 12);
  return tokens.join(" ");
}

function buildConciseVariant(input: string) {
  const words = normalizeSpace(input).split(" ");
  if (words.length <= 18) return input;
  return words.slice(0, 18).join(" ");
}

export function buildFactCheckQueryVariants(query: string) {
  const normalized = normalizeSpace(query);
  if (!normalized) return [];

  const cleaned = cleanFactCheckQuery(normalized);
  const coreClause = extractCoreClause(cleaned);
  const conciseClause = buildConciseVariant(coreClause || cleaned);
  const keywordVariant = buildKeywordVariant(coreClause || cleaned);

  return dedupeStrings([
    normalized,
    cleaned,
    coreClause,
    conciseClause,
    keywordVariant,
  ])
    .map((value) => normalizeSpace(value))
    .filter((value) => value.length >= 12)
    .slice(0, MAX_QUERY_VARIANTS);
}

function tokenOverlapScore(left: string, right: string) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  return Math.round((overlap / Math.max(leftTokens.length, 1)) * 100);
}

function classifyRating(textualRating: string) {
  const rating = textualRating.toLowerCase();

  if (
    /(false|fake|misleading|scam|hoax|fabricated|debunked|not true|incorrect|pants on fire)/i.test(
      rating,
    )
  ) {
    return "contradicting" as const;
  }

  if (/(true|correct|accurate|authentic|genuine|real|legit)/i.test(rating)) {
    return "supporting" as const;
  }

  return "insufficient" as const;
}

function humanizeSource(site?: string, fallback?: string) {
  if (fallback) return fallback;
  if (!site) return "Google Fact Check";
  if (site.includes("altnews")) return "Alt News";
  if (site.includes("boomlive")) return "BOOM";
  if (site.includes("pib.gov.in")) return "PIB Fact Check";
  return site.replace(/^www\./, "");
}

async function queryGoogleFactChecks(
  query: string,
  siteFilter?: string,
  referenceQuery: string = query,
  timeoutMs: number = FACT_CHECK_REQUEST_TIMEOUT_MS,
) {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey) {
    console.warn("Google Fact Check API: No API key found in process.env");
    return [];
  }
  if (!query.trim()) return [];

  console.log(
    `Google Fact Check API: Querying "${query.slice(0, 50)}..." ${siteFilter ? `(filter: ${siteFilter})` : ""}`,
  );

  const url = new URL(FACT_CHECK_ENDPOINT);
  url.searchParams.set("query", query.slice(0, 220));
  url.searchParams.set("languageCode", "en");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("maxAgeDays", "3650");
  if (siteFilter) {
    url.searchParams.set("reviewPublisherSiteFilter", siteFilter);
  }
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "TruthGuardPrototype/1.0" },
    });

    if (!response.ok) {
      console.error(
        `Google Fact Check API: Fetch failed with status ${response.status}`,
      );
      return [];
    }

    const payload = (await response.json()) as ClaimSearchResponse;
    console.log(
      `Google Fact Check API: Found ${(payload.claims || []).length} claims.`,
    );
    return (payload.claims || []).flatMap((claim) =>
      (claim.claimReview || []).map((review) => {
        const claimText = claim.text || query;
        const title =
          review.title || review.textualRating || "Fact check result";
        const publisherSite = review.publisher?.site;
        const publisher = humanizeSource(publisherSite, review.publisher?.name);
        const textualRating = review.textualRating || "Rating unavailable";
        const urlValue = review.url || "";
        const matchStrength = tokenOverlapScore(
          referenceQuery,
          `${claimText} ${title}`,
        );

        return {
          id: `${publisher}:${urlValue}`,
          source: publisher,
          publisher,
          publisherSite,
          title,
          url: urlValue,
          reviewDate: review.reviewDate || claim.claimDate,
          claimText,
          claimant: claim.claimant,
          textualRating,
          languageCode: review.languageCode,
          verdict: classifyRating(textualRating),
          matchStrength,
          note: siteFilter
            ? `Matched via Google Fact Check API with ${siteFilter} filter.`
            : "Matched via Google Fact Check API.",
        } satisfies FactCheckMatch;
      }),
    );
  } catch (err) {
    console.error("Google Fact Check API: Error during fetch:", err);
    return [];
  }
}

function dedupeMatches(matches: FactCheckMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = match.url || `${match.publisher}:${match.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getFactCheckMatches(query: string) {
  const trimmedQuery = query.trim();
  const apiKeyConfigured = Boolean(process.env.GOOGLE_FACT_CHECK_API_KEY);
  if (!trimmedQuery) {
    return {
      matches: [],
      resolvedQuery: "",
      attemptedQueries: [],
      warnings: apiKeyConfigured
        ? []
        : [
            "Set GOOGLE_FACT_CHECK_API_KEY to enable live Google Fact Check API matches.",
          ],
    };
  }

  const attemptedQueries = buildFactCheckQueryVariants(trimmedQuery);
  const queryPlan =
    attemptedQueries.length > 0 ? attemptedQueries : [trimmedQuery];
  let resolvedQuery = attemptedQueries[0] || trimmedQuery;
  let matches: FactCheckMatch[] = [];
  const startedAt = Date.now();

  const runVariantLookup = async (
    candidateQuery: string,
    includeSiteFilters: boolean,
  ) => {
    const elapsed = Date.now() - startedAt;
    const remainingBudget = FACT_CHECK_TOTAL_BUDGET_MS - elapsed;
    if (remainingBudget <= 250) return [];

    const timeoutMs = Math.max(
      800,
      Math.min(FACT_CHECK_REQUEST_TIMEOUT_MS, remainingBudget),
    );
    const jobs = [
      queryGoogleFactChecks(candidateQuery, undefined, trimmedQuery, timeoutMs),
      ...(includeSiteFilters
        ? SOURCE_FILTERS.map((source) =>
            queryGoogleFactChecks(
              candidateQuery,
              source.site,
              trimmedQuery,
              timeoutMs,
            ),
          )
        : []),
    ];

    const results = await Promise.all(jobs);
    const [generalMatches, ...siteMatches] = results;

    return dedupeMatches([
      ...(siteMatches.flat() || []),
      ...(generalMatches || []),
    ])
      .filter((match) => Boolean(match.url))
      .sort((left, right) => right.matchStrength - left.matchStrength)
      .slice(0, 8);
  };

  for (const candidateQuery of queryPlan) {
    matches = await runVariantLookup(candidateQuery, false);
    resolvedQuery = candidateQuery;
    if (matches.length > 0) break;
  }

  if (matches.length === 0) {
    for (const candidateQuery of queryPlan.slice(
      0,
      SITE_FILTER_VARIANT_LIMIT,
    )) {
      matches = await runVariantLookup(candidateQuery, true);
      resolvedQuery = candidateQuery;
      if (matches.length > 0) break;
    }
  }

  const warnings = !apiKeyConfigured
    ? [
        "Set GOOGLE_FACT_CHECK_API_KEY to enable live Google Fact Check API matches.",
      ]
    : [];

  return { matches, warnings, resolvedQuery, attemptedQueries: queryPlan };
}

function buildGoogleSiteSearchUrl(domain: string, query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} "${query}"`)}`;
}

export function buildOfficialSourceLinks(query: string): OfficialSourceLink[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  return SOURCE_FILTERS.map((source) => ({
    label: `${source.label} search`,
    source: source.label,
    url: buildGoogleSiteSearchUrl(source.site, trimmedQuery),
    description: `Search ${source.label} coverage for this claim.`,
  }));
}
