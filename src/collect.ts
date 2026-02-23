import Parser from "rss-parser";
import {
  RSS_FEEDS,
  KEYWORDS_FILTER,
  MIN_KEYWORD_MATCH,
  MAX_ARTICLES,
  AGE_LIMIT_HOURS,
  type RssSource,
} from "./config.js";

export interface Article {
  title: string;
  link: string;
  source: string;
  tier: 1 | 2 | 3;
  pubDate: Date;
  snippet: string;
}

const parser = new Parser({ timeout: 10_000 });

function isWithinAgeLimit(pubDate: Date): boolean {
  const now = Date.now();
  const diffHours = (now - pubDate.getTime()) / (1000 * 60 * 60);
  return diffHours <= AGE_LIMIT_HOURS;
}

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of KEYWORDS_FILTER) {
    if (lower.includes(kw.toLowerCase())) {
      count++;
      if (count >= MIN_KEYWORD_MATCH) return true;
    }
  }
  return false;
}

async function fetchFeed(source: RssSource): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => ({
        title: item.title!,
        link: item.link!,
        source: source.name,
        tier: source.tier,
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        snippet: item.contentSnippet?.slice(0, 500) ?? item.content?.slice(0, 500) ?? "",
      }));
  } catch (err) {
    console.warn(`[WARN] ${source.name} 피드 실패: ${(err as Error).message}`);
    return [];
  }
}

function deduplicate(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function collectNews(): Promise<Article[]> {
  console.log(`[수집] ${RSS_FEEDS.length}개 RSS 피드 파싱 시작...`);

  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const allArticles = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );
  console.log(`[수집] 총 ${allArticles.length}개 기사 파싱 완료`);

  // 날짜 필터
  const fresh = allArticles.filter((a) => isWithinAgeLimit(a.pubDate));
  console.log(`[필터] 24시간 이내: ${fresh.length}개`);

  // 키워드 필터
  const relevant = fresh.filter((a) =>
    matchesKeywords(`${a.title} ${a.snippet}`)
  );
  console.log(`[필터] 키워드 매칭(${MIN_KEYWORD_MATCH}개+): ${relevant.length}개`);

  // 중복 제거
  const unique = deduplicate(relevant);
  console.log(`[필터] 중복 제거 후: ${unique.length}개`);

  // 티어 우선 + 최신순 정렬, 최대 개수 제한
  const sorted = unique
    .sort((a, b) => a.tier - b.tier || b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, MAX_ARTICLES);
  console.log(`[결과] 최종 ${sorted.length}개 기사 선정`);

  return sorted;
}
