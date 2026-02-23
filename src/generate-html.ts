import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { BriefingResult } from "./summarize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolve(__dirname, "../docs/template.html");
const OUTPUT_DIR = resolve(__dirname, "../output");

const SITE_URL = "https://daily-news-three-sigma.vercel.app";

function buildOgTags(full: string, file: string, intro: string): string {
  const pageUrl = `${SITE_URL}/output/daily-${file}.html`;
  const imageUrl = `${SITE_URL}/public/banner.svg`;
  const title = `AI Daily Briefing · ${full}`;
  return `<meta property="og:type" content="article"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${intro.slice(0, 120)}"/>
<meta property="og:image" content="${imageUrl}"/>
<meta property="og:url" content="${pageUrl}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:image" content="${imageUrl}"/>
<title>${title}</title>`;
}

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

function buildBanner(): string {
  return `<div class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 220" width="100%" style="display:block;">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="60%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="lineg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#334155;stop-opacity:0"/>
      <stop offset="50%" style="stop-color:#64748b"/>
      <stop offset="100%" style="stop-color:#334155;stop-opacity:0"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#38bdf8"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="900" height="220" fill="url(#bg)"/>
  <circle cx="200" cy="110" r="100" fill="#1d4ed8" opacity="0.08" filter="url(#blur)"/>
  <circle cx="700" cy="80" r="90" fill="#7c3aed" opacity="0.07" filter="url(#blur)"/>
  <circle cx="500" cy="160" r="70" fill="#0891b2" opacity="0.06" filter="url(#blur)"/>
  <g fill="#334155" opacity="0.5">
    <rect x="60" y="30" width="1.5" height="1.5" rx="0.75"/><rect x="100" y="30" width="1.5" height="1.5" rx="0.75"/><rect x="140" y="30" width="1.5" height="1.5" rx="0.75"/>
    <rect x="60" y="60" width="1.5" height="1.5" rx="0.75"/><rect x="100" y="60" width="1.5" height="1.5" rx="0.75"/><rect x="140" y="60" width="1.5" height="1.5" rx="0.75"/>
    <rect x="60" y="90" width="1.5" height="1.5" rx="0.75"/><rect x="100" y="90" width="1.5" height="1.5" rx="0.75"/><rect x="60" y="120" width="1.5" height="1.5" rx="0.75"/>
    <rect x="760" y="120" width="1.5" height="1.5" rx="0.75"/><rect x="800" y="120" width="1.5" height="1.5" rx="0.75"/><rect x="840" y="120" width="1.5" height="1.5" rx="0.75"/>
    <rect x="760" y="150" width="1.5" height="1.5" rx="0.75"/><rect x="800" y="150" width="1.5" height="1.5" rx="0.75"/><rect x="840" y="150" width="1.5" height="1.5" rx="0.75"/>
    <rect x="760" y="180" width="1.5" height="1.5" rx="0.75"/><rect x="800" y="180" width="1.5" height="1.5" rx="0.75"/><rect x="840" y="180" width="1.5" height="1.5" rx="0.75"/>
  </g>
  <g opacity="0.6">
    <line x1="60" y1="110" x2="120" y2="80" stroke="#334155" stroke-width="1"/>
    <line x1="60" y1="110" x2="120" y2="140" stroke="#334155" stroke-width="1"/>
    <line x1="120" y1="80" x2="190" y2="110" stroke="#1e40af" stroke-width="1"/>
    <line x1="120" y1="140" x2="190" y2="110" stroke="#1e40af" stroke-width="1"/>
    <circle cx="60" cy="110" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="120" cy="80" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="120" cy="140" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="190" cy="110" r="5" fill="#1e3a5f" stroke="#38bdf8" stroke-width="1.5"/>
  </g>
  <g opacity="0.6">
    <line x1="840" y1="110" x2="780" y2="80" stroke="#334155" stroke-width="1"/>
    <line x1="840" y1="110" x2="780" y2="140" stroke="#334155" stroke-width="1"/>
    <line x1="780" y1="80" x2="710" y2="110" stroke="#4c1d95" stroke-width="1"/>
    <line x1="780" y1="140" x2="710" y2="110" stroke="#4c1d95" stroke-width="1"/>
    <circle cx="840" cy="110" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="780" cy="80" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="780" cy="140" r="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="710" cy="110" r="5" fill="#2d1b69" stroke="#818cf8" stroke-width="1.5"/>
  </g>
  <rect x="0" y="172" width="900" height="1" fill="url(#lineg)" opacity="0.4"/>
  <text x="450" y="96" font-family="ui-monospace,monospace" font-size="64" font-weight="700" letter-spacing="-2" text-anchor="middle" fill="url(#glow)" opacity="0.95">AI</text>
  <text x="450" y="142" font-family="ui-monospace,monospace" font-size="16" font-weight="400" letter-spacing="10" text-anchor="middle" fill="#94a3b8">DAILY BRIEFING</text>
  <text x="450" y="193" font-family="ui-monospace,monospace" font-size="10" letter-spacing="4" text-anchor="middle" fill="#475569">POWERED BY GEMINI · RSS INTELLIGENCE · AUTO-GENERATED</text>
</svg>
</div>`;
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
      const sourceLink = item.link
        ? `<div class="pt-3 border-t border-slate-100 dark:border-slate-800">
<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors no-underline">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm6.75-3a.75.75 0 010 1.5h2.44L8.22 9.22a.75.75 0 101.06 1.06L14.5 5.06v2.44a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5z" clip-rule="evenodd"/></svg>
${item.source ?? '원리기사 보기'}
</a>
</div>`
        : "";
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
${sourceLink}
</div>`;
    })
    .join("\n");
}

export function generateHtml(briefing: BriefingResult, date: Date = new Date()): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const { full, file, next } = formatDate(date);

  let html = template;

  // 1. OG 태그
  html = html.replace("<!-- OG_TAGS -->", buildOgTags(full, file, briefing.intro));

  // 2. 헤더: 캘린더 드롭다운 + 날짜 삽입
  html = html.replace(
    "<!-- CALENDAR_HEADER -->",
    buildCalendarHeader(file, full)
  );

  // 3. 사이드바
  const sidebarRegex = /<div class="flex flex-col text-sm">[\s\S]*?<\/div>\s*<\/aside>/;
  html = html.replace(sidebarRegex, `<div class="flex flex-col text-sm">\n${buildSidebarItems(briefing.items)}\n</div>\n</aside>`);

  // 4. 배너
  html = html.replace("<!-- BANNER -->", buildBanner());

  // 4. 서두 이탤릭 요약문
  html = html.replace(
    /<p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed serif-text italic">[\s\S]*?<\/p>/,
    `<p class="text-lg text-slate-600 dark:text-slate-300 leading-relaxed serif-text italic">\n${briefing.intro}\n</p>`
  );

  // 5. 메인 콘텐츠 카드들
  const mainContentRegex =
    /<div class="bg-white dark:bg-paper-dark rounded-lg shadow-sm border border-slate-200[\s\S]*?<div class="mt-4 p-6 bg-slate-100/;
  html = html.replace(mainContentRegex, `${buildContentCards(briefing.items)}\n<div class="mt-4 p-6 bg-slate-100`);

  // 6. Today's Remark
  html = html.replace(
    /<p class="serif-text text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic">[\s\S]*?<\/p>\s*<\/div>/,
    `<p class="serif-text text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic">\n"${briefing.remark}"\n</p>\n</div>`
  );

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
