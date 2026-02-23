import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { BriefingResult } from "./summarize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../docs/template.html");
const OUTPUT_DIR = resolve(__dirname, "../output");

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { full: `${y}.${m}.${day}`, file: `${y}${m}${day}`, next: getNextDateStr(d) };
}

function getNextDateStr(d: Date): string {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[next.getMonth()]} ${next.getDate()}, 08:00`;
}

/** output/ 디렉토리에서 실제 존재하는 daily 파일 날짜 목록 반환 (최신순) */
function getAvailableDates(): string[] {
  try {
    return readdirSync(OUTPUT_DIR)
      .filter((f) => /^daily-\d{8}\.html$/.test(f))
      .map((f) => f.replace("daily-", "").replace(".html", ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** YYYYMMDD → "YYYY.MM.DD" */
function toDisplayDate(d: string): string {
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

function buildCalendarHeader(currentFile: string, full: string): string {
  const available = getAvailableDates();
  // 현재 파일도 포함 (아직 저장 전이므로 목록에 없을 수 있음)
  if (!available.includes(currentFile)) {
    available.unshift(currentFile);
  }
  // 최대 7일까지만 표시
  const limited = available.slice(0, 7);

  const dropdownItems = limited
    .map((d) => {
      const isCurrent = d === currentFile;
      const base = "block px-4 py-2.5 text-xs font-mono transition-colors";
      const activeClass = "text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-700";
      const normalClass = "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100";
      return `<a href="daily-${d}.html" class="${base} ${isCurrent ? activeClass : normalClass}">${toDisplayDate(d)}</a>`;
    })
    .join("\n");

  return `<div class="flex items-center gap-3">
<div class="relative">
<button id="calBtn" onclick="toggleCal(event)" class="flex items-center gap-2 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
<span class="material-symbols-outlined text-[20px]">calendar_today</span>
</button>
<div id="calMenu" class="hidden absolute top-full left-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
${dropdownItems}
</div>
</div>
<h2 class="text-sm font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 font-mono">
${full} DAILY REPORT
</h2>
</div>
<script>
function toggleCal(e) {
  e.stopPropagation();
  document.getElementById('calMenu').classList.toggle('hidden');
}
document.addEventListener('click', function() {
  document.getElementById('calMenu').classList.add('hidden');
});
</script>`;
}

function buildSidebarItems(items: BriefingResult["items"]): string {
  return items
    .map((item, i) => {
      const num = String(i + 1).padStart(2, "0");
      const isFirst = i === 0;
      if (isFirst) {
        return `<a href="#news-${num}" class="group flex flex-col gap-1 p-4 text-left border-l-2 border-slate-800 bg-white dark:bg-slate-800/20 no-underline">
<span class="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">${num}. ${item.category}</span>
<span class="font-medium text-slate-900 dark:text-slate-100 group-hover:text-slate-700">${item.title}</span>
</a>`;
      }
      return `<a href="#news-${num}" class="group flex flex-col gap-1 p-4 text-left border-l-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800/50 no-underline">
<span class="font-mono text-[10px] text-slate-400 uppercase tracking-wide">${num}. ${item.category}</span>
<span class="font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">${item.title}</span>
</a>`;
    })
    .join("\n");
}

function buildContentCards(items: BriefingResult["items"]): string {
  return items
    .map((item, i) => {
      const num = String(i + 1).padStart(2, "0");
      return `<div id="news-${num}" class="bg-white dark:bg-paper-dark rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 lg:p-8 flex flex-col gap-3 scroll-mt-6">
<div class="flex items-center gap-3 mb-1">
<span class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">${num}. ${item.category}</span>
</div>
<h3 class="text-xl font-sans font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
${item.title}
</h3>
<p class="serif-text text-lg leading-relaxed text-slate-600 dark:text-slate-300">
${item.content}
</p>
</div>`;
    })
    .join("\n");
}

export function generateHtml(briefing: BriefingResult, date: Date = new Date()): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const { full, file, next } = formatDate(date);

  let html = template;

  // 1. 헤더: 캘린더 드롭다운 + 날짜 삽입
  html = html.replace(
    "<!-- CALENDAR_HEADER -->",
    buildCalendarHeader(file, full)
  );

  // 2. 사이드바
  const sidebarRegex = /<div class="flex flex-col text-sm">[\s\S]*?<\/div>\s*<\/aside>/;
  html = html.replace(sidebarRegex, `<div class="flex flex-col text-sm">\n${buildSidebarItems(briefing.items)}\n</div>\n</aside>`);

  // 3. 서두 이탤릭 요약문
  html = html.replace(
    /<p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed serif-text italic">[\s\S]*?<\/p>/,
    `<p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed serif-text italic">\n${briefing.intro}\n</p>`
  );

  // 4. 메인 콘텐츠 카드들
  const mainContentRegex =
    /<div class="bg-white dark:bg-paper-dark rounded-lg shadow-sm border border-slate-200[\s\S]*?<div class="mt-4 p-6 bg-slate-100/;
  html = html.replace(mainContentRegex, `${buildContentCards(briefing.items)}\n<div class="mt-4 p-6 bg-slate-100`);

  // 5. Today's Remark
  html = html.replace(
    /<p class="serif-text text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic">[\s\S]*?<\/p>\s*<\/div>\s*<div class="mt-8/,
    `<p class="serif-text text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic">\n"${briefing.remark}"\n</p>\n</div>\n<div class="mt-8`
  );

  // 6. Next 날짜
  html = html.replace(/Next: .+?(?=\s*<\/div>)/, `Next: ${next}`);

  return html;
}

export function saveHtml(html: string, date: Date = new Date()): string {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const { file } = formatDate(date);
  const outputPath = resolve(OUTPUT_DIR, `daily-${file}.html`);
  writeFileSync(outputPath, html, "utf-8");
  console.log(`[생성] ${outputPath}`);
  return outputPath;
}
