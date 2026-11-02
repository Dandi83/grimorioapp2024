// PROMPT 47: «Chi resta davvero» on fixed dates. A person arrived 21 days before `now` and came back 14 days before: the
// table (lib/analytics-stats.ts cohorts(), weeks Monday–Sunday in Rome) and the expectation of the e2e
// (e2e/cohort-expect.mjs) must agree, and agree with the values worked out by hand below, on Sunday evening, Monday
// morning, the end of a month and both clock changes.
// Run: NODE_OPTIONS=--require=./tests/register-ts.cjs node tests/cohort-dates.cjs
const assert=require('node:assert/strict');
const {cohorts}=require('../lib/analytics-stats.ts');

const CASES=[
 // 1/11/2026 23:00 in Rome (Sunday, after the change of 25/10): the arrival, 11/10 22:00 UTC, is Monday 12/10 in Rome; the
 // week of 26/10 ends today, Sunday, so it is not over yet (the failure of 1/11 on main).
 {now:'2026-11-01T22:00:00Z',week:'2026-10-12',cells:['100%','—','—']},
 // Monday morning after: that week is over, no visit in it.
 {now:'2026-11-02T07:00:00Z',week:'2026-10-12',cells:['100%','0%','—']},
 // End of a month (Saturday 31/10 and Monday 30/11).
 {now:'2026-10-31T12:00:00Z',week:'2026-10-05',cells:['100%','0%','—']},
 {now:'2026-11-30T12:00:00Z',week:'2026-11-09',cells:['100%','0%','—']},
 // The night of the change to winter time (Monday 26/10 00:30 in Rome).
 {now:'2026-10-25T23:30:00Z',week:'2026-10-05',cells:['100%','0%','—']},
 // The night of the change to summer time (Monday 29/3/2027 00:30 in Rome): the arrival is Sunday 7/3 in Rome.
 {now:'2027-03-28T22:30:00Z',week:'2027-03-01',cells:['100%','0%','—']},
];

(async()=>{
 const {expectedCohort,romeDay,mondayOf}=await import('../e2e/cohort-expect.mjs');
 for(const {now:iso,week,cells} of CASES){
  const now=new Date(iso);
  // As the SQL of lib/analytics.ts readCohortPeople(): the Monday (Rome) of the arrival and of each return.
  const person={week:mondayOf(romeDay(new Date(now-21*864e5))),instagram:true,back:[mondayOf(romeDay(new Date(now-14*864e5)))]};
  const row=cohorts(romeDay(now),[person]).find(r=>r.week===person.week&&r.group==='instagram');
  assert.ok(row,`${iso}: the week of arrival is in the table`);
  assert.equal(row.week,week,iso);
  assert.deepEqual(row.after.map(v=>v===null?'—':`${v}%`),cells,`${iso}: table`);
  assert.deepEqual(expectedCohort(now,21,14),{week,cells},`${iso}: e2e expectation`);
 }
 console.log(`Coorti: ${CASES.length} date fisse (domenica sera, lunedì mattina, fine mese, cambi dell’ora): tabella e prova d’accordo.`);
})().catch(error=>{console.error(error);process.exit(1);});
