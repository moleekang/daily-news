export interface RssSource {
  name: string;
  url: string;
  tier: 1 | 2 | 3;
}

export const RSS_FEEDS: RssSource[] = [
  // Tier 1: 공식 블로그
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss/", tier: 1 },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/feed/", tier: 1 },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", tier: 1 },
  { name: "Anthropic Blog", url: "https://www.anthropic.com/feed.xml", tier: 1 },

  // Tier 2: 전문 테크 매체
  { name: "TechCrunch", url: "https://techcrunch.com/feed", tier: 2 },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/feed.xml", tier: 2 },
  { name: "Ars Technica", url: "https://arstechnica.com/feed/", tier: 2 },
  { name: "Wired", url: "https://www.wired.com/feed/rss", tier: 2 },

  // Tier 3: 종합 매체/커뮤니티
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", tier: 3 },
  { name: "Hacker News", url: "https://news.ycombinator.com/rss", tier: 3 },
  { name: "Product Hunt", url: "https://www.producthunt.com/feed", tier: 3 },
  { name: "Bloomberg Tech", url: "https://feeds.bloomberg.com/technology/news.rss", tier: 3 },
  { name: "Axios", url: "https://api.axios.com/feed/", tier: 3 },
  { name: "Business Insider Tech", url: "https://feeds.businessinsider.com/custom/all", tier: 3 },
  { name: "CNBC Tech", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910", tier: 3 },
];

export const KEYWORDS_FILTER = [
  // AI 핵심
  "AI", "artificial intelligence", "GPT", "Claude", "LLM",
  "machine learning", "deep learning", "generative",
  "large language model", "foundation model",
  // AI 기업/모델
  "Anthropic", "OpenAI", "Google AI", "Meta AI",
  "DeepSeek", "xAI", "Grok", "Gemini", "Mistral",
  "AGI", "superintelligence", "AI safety",
  // AI 도구/서비스
  "agent", "automation", "no-code", "low-code",
  "AI startup", "AI SaaS", "AI API",
  "chatbot", "copilot", "AI assistant",
  // AI 인프라
  "Nvidia", "GPU", "AI chip", "data center",
];

export const MIN_KEYWORD_MATCH = 2;
export const MAX_ARTICLES = 20;
export const AGE_LIMIT_HOURS = 24;

export const GEMINI_MODEL = "gemini-2.0-flash";
