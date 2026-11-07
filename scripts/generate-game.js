// Dependency-free animated SVG. Node.js 24+.
const fs = require('node:fs');
const path = require('node:path');
const { renderBlast } = require('./render-blast');
const colors = ['#1a2638','#244b60','#267f8d','#35b9b5','#8bf0d4'];
const levels = ['NONE','FIRST_QUARTILE','SECOND_QUARTILE','THIRD_QUARTILE','FOURTH_QUARTILE'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
async function fetchCalendar(user, token) {
  if (!token) throw new Error('GH_TOKEN is required. Use --demo for an offline preview.');
  const res = await fetch('https://api.github.com/graphql', {
    method:'POST', signal:AbortSignal.timeout(30000),
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','User-Agent':'contribution-interceptor'},
    body:JSON.stringify({query:'query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}}}',variables:{u:user}})
  });
  if (!res.ok) throw new Error(`GitHub API: HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors || !json.data?.user) throw new Error('Calendar unavailable. Check the account and token permissions.');
  return json.data.user.contributionsCollection.contributionCalendar;
}
function demoCalendar() {
  const weeks = Array.from({length:53},(_,w)=>({contributionDays:Array.from({length:7},(_,d)=>{
    const n = (w*13+d*7)%11, level = n < 5 ? n : 0;
    return {weekday:d,date:`Sample week ${w+1}, day ${d+1}`,contributionCount:level,contributionLevel:levels[level]};
  })}));
  return {weeks,totalContributions:weeks.flatMap(w=>w.contributionDays).reduce((a,d)=>a+d.contributionCount,0)};
}
function render(calendar,{user='Mhalexmd',demo=false,updated=new Date().toISOString()}={}) {
  if (!calendar.weeks?.length || calendar.weeks.length>54) throw new Error('Invalid calendar');
  const step=15, left=51, top=120, lane=104, start=1.2, interval=.48;
  const duration=start+calendar.weeks.length*interval+2;
  const t=n=>(n/duration).toFixed(7), px=w=>left+w*step+5.5;
  let grid='',bullets='',targets=0;
  const positions=[px(0),px(0)], times=[0,start];
  calendar.weeks.forEach((week,w)=>{
    const arrival=start+w*interval;
    if(w>0){positions.push(px(w));times.push(arrival);}
    positions.push(px(w));times.push(arrival+.34);
    week.contributionDays.forEach(day=>{
      const level=levels.indexOf(day.contributionLevel), d=day.weekday;
      if(level<0 || !Number.isInteger(d) || d<0 || d>6) throw new Error('Invalid calendar day');
      const x=left+w*step,y=top+d*step,color=colors[level];
      const fire=arrival+.025+d*.025,hit=fire+(y-lane)/620;
      grid+=`<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="${color}"><title>${esc(day.date)}: ${day.contributionCount} contributions</title>`;
      if(level){
        targets++;
        grid+=`<animate attributeName="fill" dur="${duration}s" repeatCount="indefinite" calcMode="discrete" values="${color};#fff4d8;${colors[0]}" keyTimes="0;${t(hit)};${t(hit+.09)}"/>`;
        bullets+=`<rect x="${px(w)-1}" y="${lane}" width="2" height="5" fill="#ffcd75" opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;${t(fire)};${t(hit)}" calcMode="discrete" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="y" values="${lane};${lane};${y}" keyTimes="0;${t(fire)};${t(hit)}" dur="${duration}s" repeatCount="indefinite"/></rect>`;
      }
      grid+='</rect>';
    });
  });
  positions.push(px(calendar.weeks.length-1));times.push(duration);
  const label=demo?'DEMO / SAMPLE DATA':`${calendar.totalContributions.toLocaleString('en-US')} CONTRIBUTIONS / PAST YEAR`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="898" height="294" viewBox="0 0 898 294" role="img" aria-labelledby="title desc">
<title id="title">${esc(user)} — Contribution interceptor${demo?' demo':''}</title><desc id="desc">A pixel airplane shoots at active days. ${esc(label)}. Updated ${esc(updated)}.</desc>
<rect width="898" height="294" rx="18" fill="#0b101b"/><rect x="1" y="1" width="896" height="292" rx="17" fill="none" stroke="#26354a"/>
<g font-family="ui-monospace,Consolas,monospace"><text x="28" y="33" fill="#ffcd75" font-size="12" letter-spacing="3">CONTRIBUTION INTERCEPTOR</text><text x="28" y="57" fill="#8596af" font-size="11">${esc(label)}</text><text x="870" y="33" text-anchor="end" fill="#8bf0d4" font-size="11">P1 / ${esc(user)}</text>
<path d="M28 72H870" stroke="#26354a"/>
${[1,3,5].map(d=>`<text x="22" y="${top+d*step+9}" fill="#8596af" font-size="9">${['S','M','T','W','T','F','S'][d]}</text>`).join('')}
${grid}${bullets}
<g><animateTransform attributeName="transform" type="translate" values="${positions.map(x=>`${x},${lane-11}`).join(';')}" keyTimes="${times.map(t).join(';')}" dur="${duration}s" repeatCount="indefinite"/>
<g transform="rotate(180)" data-sprite="downward-plane"><path d="M-2-11H2V-3H5V1H10V5H3V8H6V11H-6V8H-3V5H-10V1H-5V-3H-2Z" fill="#ffcd75"/><path d="M-1-5H1V2H-1Z" fill="#0b101b"/><rect x="-1" y="13" width="2" height="4" fill="#b79aff"><animate attributeName="opacity" values="1;.3;1" dur=".25s" repeatCount="indefinite"/></rect></g></g>
<path d="M28 239H870" stroke="#26354a"/><text x="28" y="263" fill="#8596af" font-size="10">${targets} TARGETS · AUTO LOOP · ${demo?'AWAITING FIRST LIVE SYNC':esc(updated.slice(0,16).replace('T',' '))+' UTC'}</text><text x="870" y="263" text-anchor="end" fill="#8596af" font-size="10">LOW ${colors.slice(1).map(c=>`<tspan fill="${c}">■</tspan>`).join(' ')} HIGH</text></g></svg>`;
}
async function main(){
  const demo=process.argv.includes('--demo'),user=process.env.GH_USER||'Mhalexmd';
  const calendar=demo?demoCalendar():await fetchCalendar(user,process.env.GH_TOKEN);
  const svg=render(calendar,{user,demo}),output=path.resolve(process.env.OUTPUT_DIR||'assets');
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'plane.svg'),svg);
  fs.writeFileSync(path.join(output, 'afterimage.svg'), renderBlast(calendar, {demo}));
  console.log(`Generated ${demo?'demo':'live'} flight for ${user}.`);
}
if(require.main===module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={render,demoCalendar,fetchCalendar};
