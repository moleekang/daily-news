import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "./config.js";
import type { Article } from "./collect.js";

export interface BriefingItem {
  category: string;
  title: string;
  content: string;
  link?: string;
  source?: string;
  sourceIndex?: number;
}

// 2개 섹션으로 나눈 브리핑 결과
export interface BriefingResult {
  intro: string;
  softwareItems: BriefingItem[];  // 소프트웨어/도구 (사용자가 직접 쓸 수 있는 것)
  newsItems: BriefingItem[];      // AI 뉴스/시사 (업계 동향, 투자, 규제 등)
  remark: string;
}

const SYSTEM_PROMPT = `당신은 AI/테크 뉴스를 초보자도 이해할 수 있게 쉽게 풀어주는 에디터입니다.
주어진 뉴스 기사들을 분석하여 한국어 데일리 브리핑을 작성합니다.

## 핵심 규칙: 반드시 2개 섹션으로 분류하세요

### 섹션 1: softwareItems (소프트웨어 & 도구) — 반드시 4~5개!
- 사용자가 **직접 써볼 수 있는** 앱, 서비스, 도구, 기능 업데이트
- 예: 새로운 AI 앱 출시, 기존 서비스에 AI 기능 추가, 무료 도구 공개, 브라우저 확장 등
- 소프트웨어 업데이트나 새 기능 발표도 여기에 포함
- **최소 4개, 최대 5개** 반드시 채워주세요

### 섹션 2: newsItems (AI 뉴스 & 시사) — 반드시 4~5개!
- 업계 동향, 기업 경쟁, 투자, 규제, 연구 성과, 인물 등
- 사용자가 직접 쓰는 건 아니지만 알아두면 좋은 소식
- **최소 4개, 최대 5개** 반드시 채워주세요

## 작성 규칙
1. **쉬운 말로 쓰세요!** AI를 처음 접하는 사람도 이해할 수 있게 설명하세요
2. 어려운 전문 용어가 나오면 괄호 안에 쉬운 설명을 붙이세요
   - 예: "LLM(사람처럼 글을 쓰는 AI 모델)"
   - 예: "파인튜닝(기존 AI를 특정 목적에 맞게 다시 학습시키는 것)"
3. 제목은 한국어로 자연스럽고 흥미롭게 작성하세요
4. 내용은 2~3문장으로, "이게 왜 중요한지"도 한 줄 포함하세요
5. 서두(intro)는 오늘 뉴스를 1~2문장으로 가볍게 소개하세요
6. 총평(remark)은 오늘 뉴스의 큰 흐름을 쉽게 정리하세요
7. 각 항목에 sourceIndex(원본 기사 번호, 1부터 시작)를 반드시 포함하세요
8. 카테고리는 자유롭게 (App, Tool, Update, Market, Research, Policy 등)

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "intro": "오늘의 서두 요약문",
  "softwareItems": [
    { "category": "카테고리", "title": "한국어 제목", "content": "쉽게 풀어쓴 요약 2~3문장", "sourceIndex": 1 }
  ],
  "newsItems": [
    { "category": "카테고리", "title": "한국어 제목", "content": "쉽게 풀어쓴 요약 2~3문장", "sourceIndex": 1 }
  ],
  "remark": "오늘의 총평"
}`;

export async function summarizeNews(articles: Article[]): Promise<BriefingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title}\nSource: ${a.source} (Tier ${a.tier})\nDate: ${a.pubDate.toISOString()}\nLink: ${a.link}\nSnippet: ${a.snippet}`
    )
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}\n\n--- 수집된 뉴스 (${articles.length}건) ---\n\n${articleList}`;

  console.log(`[요약] Gemini ${GEMINI_MODEL}에 ${articles.length}건 전달 중...`);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 파싱 (```json ... ``` 감싸기 처리)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini 응답에서 JSON을 추출할 수 없습니다:\n" + text.slice(0, 500));
  }

  const parsed = JSON.parse(jsonMatch[0]) as BriefingResult;

  // 원본 Article과 매핑하여 link/source 추가 (두 섹션 모두 처리)
  const allItems = [...(parsed.softwareItems ?? []), ...(parsed.newsItems ?? [])];
  allItems.forEach((item) => {
    item.title = item.title.replace(/\s*\(sourceIndex:\s*\d+\)\s*/gi, "").trim();

    if (item.sourceIndex && item.sourceIndex >= 1 && item.sourceIndex <= articles.length) {
      const originalArticle = articles[item.sourceIndex - 1];
      item.link = originalArticle.link;
      try {
        const domain = new URL(originalArticle.link).hostname.replace("www.", "");
        item.source = originalArticle.source === "Hacker News" ? domain : originalArticle.source;
      } catch {
        item.source = originalArticle.source;
      }
    }
  });

  console.log(`[요약] 소프트웨어 ${parsed.softwareItems?.length ?? 0}개 + 뉴스 ${parsed.newsItems?.length ?? 0}개 생성 완료`);
  return parsed;
}
