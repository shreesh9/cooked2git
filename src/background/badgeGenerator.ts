/**
 * badgeGenerator.ts — Retro SVG "Cooked Card" Stats Badge Generator
 * Generates embeddable retro pixel-art SVG badge for user's GitHub README.
 * Displays streak count, total solved/pushed, and difficulty breakdown.
 */

export interface BadgeStats {
  streak: number;
  totalPushed: number;
  easy: number;
  medium: number;
  hard: number;
}

export function generateRetroBadgeSVG(stats: BadgeStats): string {
  const { streak, totalPushed, easy, medium, hard } = stats;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="120" viewBox="0 0 380 120" shape-rendering="crispEdges">
  <defs>
    <style>
      .bg { fill: #09090B; stroke: #222228; stroke-width: 2; }
      .border-glow { stroke: #FF0B3A; stroke-width: 1; }
      .title { font-family: 'Courier New', monospace; font-weight: bold; font-size: 13px; fill: #F2F2F0; letter-spacing: 1px; }
      .accent { fill: #FF0B3A; }
      .text-ash { font-family: 'Courier New', monospace; font-size: 10px; fill: #8A8A93; }
      .text-num { font-family: 'Courier New', monospace; font-weight: bold; font-size: 16px; fill: #F2F2F0; }
      .green { fill: #39FF88; }
      .yellow { fill: #FFB700; }
      .red { fill: #FF2A55; }
    </style>
  </defs>

  <!-- Outer Panel -->
  <rect x="2" y="2" width="376" height="116" rx="6" class="bg" />
  <rect x="2" y="2" width="376" height="116" rx="6" fill="none" class="border-glow" />

  <!-- Header -->
  <text x="16" y="24" class="title">COOKED<tspan class="accent">2</tspan>GIT <tspan class="text-ash">// LEETCODE STATS</tspan></text>
  <line x1="16" y1="32" x2="364" y2="32" stroke="#222228" stroke-width="1" />

  <!-- Main Stats Grid -->
  <!-- Streak -->
  <text x="16" y="52" class="text-ash">STREAK</text>
  <text x="16" y="74" class="text-num green">${streak} 🔥</text>

  <!-- Total Pushed -->
  <text x="120" y="52" class="text-ash">SOLUTIONS PUSHED</text>
  <text x="120" y="74" class="text-num">${totalPushed}</text>

  <!-- Difficulty Breakdown -->
  <text x="270" y="52" class="text-ash">DIFFICULTY</text>
  <text x="270" y="70" class="text-ash"><tspan class="green">EASY:</tspan> ${easy}</text>
  <text x="270" y="85" class="text-ash"><tspan class="yellow">MED:</tspan> ${medium}</text>
  <text x="270" y="100" class="text-ash"><tspan class="red">HARD:</tspan> ${hard}</text>

  <!-- Footer Watermark -->
  <text x="16" y="104" class="text-ash" style="font-size: 8px;">ZERO-TRUST AUTO-SYNC BY COOKED2GIT</text>
</svg>`;
}
