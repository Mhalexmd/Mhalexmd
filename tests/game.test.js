const {test}=require('node:test');
const assert=require('node:assert/strict');
const {render,demoCalendar,fetchCalendar}=require('../scripts/generate-game');
test('all targets have shots, and animation times are strictly increasing',()=>{
  const data=demoCalendar(),svg=render(data,{demo:true});
  const targets=data.weeks.flatMap(w=>w.contributionDays).filter(d=>d.contributionCount>0).length;
  assert.equal((svg.match(/attributeName="opacity" values="0;1;0"/g)||[]).length,targets);
  for(const match of svg.matchAll(/keyTimes="([^"]+)"/g)){
    const times=match[1].split(';').map(Number);
    assert.equal(times[0],0);
    assert.ok(times.every((n,i)=>n>=0&&n<=1&&(!i||n>times[i-1])));
  }
  assert.ok(!/NaN|undefined/.test(svg));
});
test('partial weeks preserve actual weekday and empty calendars remain valid',()=>{
  const svg=render({totalContributions:0,weeks:[{contributionDays:[{weekday:6,date:'2026-01-03',contributionCount:0,contributionLevel:'NONE'}]}]});
  assert.match(svg,/x="51" y="210"/);
  assert.match(svg,/0 TARGETS/);
  assert.doesNotMatch(svg,/attributeName="opacity" values="0;1;0"/);
});
test('escapes text and rejects invalid data',()=>{
  assert.match(render(demoCalendar(),{user:'<pilot & co>'}),/&lt;pilot &amp; co&gt;/);
  assert.throws(()=>render({weeks:[]}),/Invalid calendar/);
});
test('missing token fails instead of publishing fake activity',async()=>{
  await assert.rejects(fetchCalendar('Mhalexmd',''),/GH_TOKEN/);
});
