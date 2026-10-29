// Atari-style airplane on your GitHub contribution graph.
// The plane flies over the heatmap and shoots down every day you contributed.
// Run by GitHub Actions (Node 18+, no dependencies) -> dist/plane.svg

const fs = require("fs");

const USER = process.env.GH_USER;
const TOKEN = process.env.GH_TOKEN;

// ====== EDIT YOUR COLORS HERE ======
const C = {
  bg: "#0d1117",
  empty: "#161b22",
  levels: ["#3b1d6e", "#6d28d9", "#a855f7", "#ec4899"], // low -> high activity
  plane: "#facc15",
  bullet: "#fde68a",
  flash: "#ffffff",
};
const COL_T = 0.35;   // seconds the plane spends per week-column (lower = faster plane)
const GAP_T = 0.03;   // delay between shots in the same column
const BULLET_V = 320; // bullet speed (px/s)
// ===================================

const CELL = 12, GAP = 3, STEP = CELL + GAP, PAD = 20, PAD_TOP = 46, LANE_Y = 20;
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function getWeeks() {
  const query = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{weeks{contributionDays{contributionLevel}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { u: USER } }),
  });
  const json = await res.json();
  if (!json.data) throw new Error(JSON.stringify(json));
  return json.data.user.contributionsCollection.contributionCalendar.weeks.map((w) =>
    w.contributionDays.map((d) => LEVEL[d.contributionLevel])
  );
}

(async () => {
  const weeks = await getWeeks();
  const nW = weeks.length;
  const width = PAD * 2 + nW * STEP - GAP;
  const height = PAD_TOP + 7 * STEP - GAP + PAD;
  const f = (v) => v.toFixed(5);

  // Pass 1: schedule every shot (top-most active cell first, column by column)
  const shots = [];
  let maxHit = nW * COL_T;
  weeks.forEach((days, w) => {
    let k = 0;
    days.forEach((level, d) => {
      if (level === 0) return;
      const cx = PAD + w * STEP + CELL / 2;
      const cy = PAD_TOP + d * STEP + CELL / 2;
      const fire = w * COL_T + k * GAP_T;
      const y0 = LANE_Y + 10;
      const hit = fire + (cy - y0) / BULLET_V;
      maxHit = Math.max(maxHit, hit);
      shots.push({ cx, cy, y0, fire, hit, w, d, level });
      k++;
    });
  });
  const total = +(maxHit + 1.0).toFixed(2);

  // Pass 2: draw the grid (+ explosion flash when a shot lands)
  let grid = "";
  weeks.forEach((days, w) => {
    days.forEach((level, d) => {
      const x = PAD + w * STEP, y = PAD_TOP + d * STEP;
      const base = `x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3"`;
      if (level === 0) return (grid += `<rect ${base} fill="${C.empty}"/>`);
      const s = shots.find((q) => q.w === w && q.d === d);
      const col = C.levels[level - 1];
      const eps = 0.08 / total;
      grid += `<rect ${base} fill="${col}"><animate attributeName="fill" dur="${total}s" repeatCount="indefinite" calcMode="discrete" values="${col};${C.flash};${C.empty}" keyTimes="0;${f(s.hit / total)};${f(s.hit / total + eps)}"/></rect>`;
    });
  });

  // Bullets
  let bullets = "";
  shots.forEach((s) => {
    const t0 = f(s.fire / total), t1 = f(s.hit / total);
    bullets += `<rect x="${s.cx - 1}" y="${s.y0}" width="2" height="6" fill="${C.bullet}" opacity="0">` +
      `<animate attributeName="opacity" dur="${total}s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;${t0};${t1}"/>` +
      `<animate attributeName="y" dur="${total}s" repeatCount="indefinite" values="${s.y0};${s.y0};${s.cy - 3}" keyTimes="0;${t0};${t1}"/></rect>`;
  });

  // Plane (top-down pixel sprite, flies left -> right)
  const v = STEP / COL_T, off = 3 * GAP_T;
  const x0 = PAD + CELL / 2;
  const xs = x0 - off * v, xe = x0 + (total - off) * v;
  const plane = `
  <g transform="translate(${xs.toFixed(1)},${LANE_Y})" shape-rendering="crispEdges">
    <animateTransform attributeName="transform" type="translate" dur="${total}s" repeatCount="indefinite" values="${xs.toFixed(1)},${LANE_Y};${xe.toFixed(1)},${LANE_Y}"/>
    <rect x="-10" y="-2" width="20" height="4" fill="${C.plane}"/>
    <rect x="10" y="-1" width="3" height="2" fill="${C.plane}"/>
    <rect x="-3" y="-9" width="5" height="18" fill="${C.plane}"/>
    <rect x="-10" y="-5" width="3" height="10" fill="${C.plane}"/>
    <rect x="3" y="-1" width="3" height="2" fill="${C.bg}"/>
  </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" rx="12" fill="${C.bg}"/>
  <defs><clipPath id="c"><rect width="${width}" height="${height}" rx="12"/></clipPath></defs>
  <g clip-path="url(#c)">
  ${grid}
  ${bullets}
  ${plane}
  </g>
</svg>`;

  fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync("dist/plane.svg", svg);
  console.log(`Done: ${shots.length} targets, ${total}s loop`);
})();
