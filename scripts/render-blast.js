const palette = ['#22221f', '#64513a', '#9b7245', '#d69b55', '#ffdc96'];
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const seconds = 14;

function animate(attribute, values, times) {
  return `<animate attributeName="${attribute}" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${seconds}s" repeatCount="indefinite"/>`;
}

function motion(type, values, times) {
  return `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${seconds}s" repeatCount="indefinite"/>`;
}

function renderBlast(calendar, {demo = false} = {}) {
  const days = calendar.weeks.flatMap((week, i) => week.contributionDays.map(day => ({
    ...day, x: 37 + i * 16, y: 169 + day.weekday * 16,
  })));
  // Prefer a busy day near the middle of the frame for a readable silhouette.
  const active = days.filter(day => day.contributionCount > 0);
  const middle = active.filter(day => Math.abs(day.x - 455) < 180);
  const target = (middle.length ? middle : active).reduce((best, day) =>
    !best || day.contributionCount > best.contributionCount ? day : best, null);
  const {x, y} = target || {x:455, y:217};
  const impact = .46, speed = 2200;
  const grid = days.map(day => {
    const ink = palette[levels.indexOf(day.contributionLevel)];
    const hit = impact + Math.hypot(day.x-x, day.y-y)/speed;
    const burn = day.contributionCount ? animate('fill',
      [ink, ink, '#fff2bc', '#c85826', '#28231e', '#28231e', ink, ink],
      [0,hit,hit+.008,hit+.025,hit+.066,.93,.97,1]) : '';
    return `<rect x="${day.x-6}" y="${day.y-6}" width="12" height="12" rx="2" fill="${ink}"><title>${day.date}: ${day.contributionCount}</title>${burn}</rect>`;
  }).join('');
  const bomber = `<g>${motion('translate', ['-70 91',x+' 91','1000 91','1000 91'],[0,.33,.65,1])}
    <path d="M-45-4L-53-16H-46L-33-6L-9-6L-26-36H-18L12-6L32-5Q46-5 52 0Q45 5 32 5H12L-18 36H-26L-9 6H-33L-46 16H-53L-45 4Z" fill="#b9b8a5" stroke="#423e36"/>
    <path d="M-13-24H0M-6-14H8M-13 24H0M-6 14H8" stroke="#ddd8bd" stroke-width="4"/><path d="M36-3L43 0L36 1Z" fill="#272b29"/></g>`;
  const cloud = `<g transform="translate(${x} ${y})"><g opacity="0">${animate('opacity',[0,0,1,1,0,0],[0,impact,.48,.66,.83,1])}
    <g>${motion('scale',['.02','.02','.45','1','1.12'],[0,impact,.49,.6,1])}
    <path d="M-52 1Q-32-10-12-9Q-21-22-10-30Q-16-41-22-46Q-48-40-62-55Q-87-54-91-70Q-96-88-73-94Q-72-111-47-109Q-29-127-8-119Q13-132 34-117Q59-121 70-102Q98-99 93-80Q111-62 83-56Q69-40 44-44Q23-48 14-37Q23-25 12-19Q11-10 27-7Q44-7 55 1Z" fill="url(#fire)"/>
    <path d="M-79-77Q-65-94-51-83Q-44-102-24-93Q-7-112 14-98Q32-104 46-90Q66-99 80-79M-56-61Q-39-50-26-61Q-10-47 8-61Q25-52 42-63M-8-37Q3-32 12-39" fill="none" stroke="#ffcc75" stroke-opacity=".7" stroke-width="3"/>
    </g></g></g>`;
  const blast = target ? `<g opacity="0">${animate('opacity',[0,0,1,1,0,0],[0,.329,.33,.459,impact,1])}
    <g>${motion('translate',[x+' 95',x+' 95',x+' '+(y-5),x+' '+(y-5)],[0,.33,impact,1])}<path d="M-5-9L0-6L5-9L3-3Q7 5 0 10Q-7 5-3-3Z" fill="#ffe1a1"/></g></g>
    <circle cx="${x}" cy="${y}" r="0" fill="none" stroke="#ffd791" stroke-width="5">${animate('r',[0,0,880,880],[0,impact,impact+880/speed,1])}${animate('opacity',[0,0,.95,.22,0,0],[0,impact,.47,.68,.86,1])}</circle>
    ${cloud}` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="318" viewBox="0 0 920 318" role="img" aria-labelledby="t"><title id="t">Afterimage — a bomber above the contribution calendar</title>
  <defs><linearGradient id="fire" x2="0" y2="1"><stop stop-color="#fff1ad"/><stop offset=".27" stop-color="#ee9d48"/><stop offset=".55" stop-color="#9c4528"/><stop offset="1" stop-color="#564133"/></linearGradient><clipPath id="frame"><rect x="12" y="54" width="896" height="222"/></clipPath></defs>
  <rect width="920" height="318" rx="14" fill="#141514"/><path d="M23 49H897M23 280H897" stroke="#484338"/>
  <g font-family="Consolas,monospace"><text x="28" y="32" fill="#e8d7b4" font-size="18" letter-spacing="4">AFTERIMAGE</text><text x="892" y="31" text-anchor="end" fill="#bd9967" font-size="11">70 MM / STUDY 01</text>
  <text x="28" y="303" fill="#c2ae90" font-size="11">${demo?'SAMPLE CALENDAR':Number(calendar.totalContributions).toLocaleString('en-US')+' CONTRIBUTIONS'} · PAST YEAR</text><text x="892" y="303" text-anchor="end" fill="#a99c88" font-size="11">${target?'GROUND ZERO / '+target.date:'RECONNAISSANCE'}</text></g>
  <g clip-path="url(#frame)">${grid}${bomber}${blast}</g></svg>`;
}
module.exports = {renderBlast};
