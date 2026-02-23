import { config } from "dotenv";
import { collectNews } from "./collect.js";
import { summarizeNews } from "./summarize.js";
import { generateHtml, saveHtml } from "./generate-html.js";

config(); // .env 로드

async function main() {
  const today = new Date();
  console.log(`\n=== AI Daily Briefing ===`);
  console.log(`날짜: ${today.toISOString().split("T")[0]}\n`);

  // 1. 뉴스 수집
  const articles = await collectNews();
  if (articles.length === 0) {
    console.log("[완료] 수집된 기사가 없습니다. 종료합니다.");
    return;
  }

  // 2. Gemini로 요약
  const briefing = await summarizeNews(articles);

  // 3. HTML 생성
  const html = generateHtml(briefing, today);
  const outputPath = saveHtml(html, today);

  console.log(`\n[완료] 브리핑 생성 완료: ${outputPath}`);
}

main().catch((err) => {
  console.error("[오류]", err);
  process.exit(1);
});
