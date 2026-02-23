import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "./config.js";
import type { Article } from "./collect.js";

export interface BriefingItem {
  category: string;
  title: string;
  content: string;
  link: string;
  source: string;
}

export interface BriefingResult {
  intro: string;
  items: BriefingItem[];
  remark: string;
}

const SYSTEM_PROMPT = `당신은 AI/테크 전문 뉴스 에디터입니다.
주어진 영문 뉴스 기사들을 분석하여 한국어 데일리 브리핑을 작성합니다.

규칙:
1. 각 기사를 적절한 카테고리로 분류하세요 (Hardware, Software, Market, Infra, AI Research, Product 등)
2. 제목은 한국어로 자연스럽게 작성하세요
3. 내용은 한국어로 2~3문장으로 요약하되, 핵심 팩트와 시사점을 포함하세요
4. 전문 용어는 영어를 병기하세요 (예: 대규모 언어모델(LLM))
5. 서두 요약문(intro)은 오늘의 전체 뉴스를 1~2문장으로 개괄하세요
6. 총평(remark)은 오늘의 뉴스에서 읽을 수 있는 큰 흐름이나 시사점을 1~2문장으로 작성하세요
7. 최대 7개 기사를 선별하여 가장 중요한 것만 포함하세요

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "intro": "오늘의 서두 요약문",
  "items": [
    { "category": "카테고리", "title": "한국어 제목", "content": "한국어 요약 2~3문장" }
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
  console.log(`[요약] ${parsed.items.length}개 항목 생성 완료`);
  return parsed;
}
