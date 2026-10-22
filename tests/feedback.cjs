const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');

const deps={};
function load(relative){
 const filename=path.resolve(relative),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='server-only')return {};
  if(id in deps)return deps[id];
  if(id.startsWith('./'))return load(path.resolve(path.dirname(filename),id)+'.ts');
  return createRequire(filename)(id);
 },mod,mod.exports);return mod.exports;
}

const input=load('lib/feedback-input.ts');
const valid={tipo:'errore',messaggio:'Il raggio dovrebbe essere di 6 metri.',percorso:'/spell/palla-di-fuoco',edizione:'2024',email:'',token:'t',sito:''};

// Validation: type, message 10–2000 characters, optional email checked only when written.
let r=input.parseFeedback(valid);
assert.equal(r.ok,true);assert.equal(r.spam,false);
assert.deepEqual(r.value,{tipo:'errore',messaggio:'Il raggio dovrebbe essere di 6 metri.',percorso:'/spell/palla-di-fuoco',edizione:'2024',email:null});
assert.equal(input.parseFeedback({...valid,tipo:'altro'}).ok,false,'unknown type');
assert.equal(input.parseFeedback({...valid,messaggio:'   corto   '}).ok,false,'under 10 characters after trimming');
assert.equal(input.parseFeedback({...valid,messaggio:'x'.repeat(2001)}).ok,false,'over 2000 characters');
assert.equal(input.parseFeedback({...valid,messaggio:'😀'.repeat(2000)}).ok,true,'an emoji counts as one character');
assert.equal(input.parseFeedback({...valid,messaggio:42}).ok,false);
assert.equal(input.parseFeedback(null).ok,false);
assert.match(input.parseFeedback({...valid,email:'nome@'}).error,/Email non valida/);
assert.equal(input.parseFeedback({...valid,email:'nome@esempio.it'}).value.email,'nome@esempio.it');
assert.equal(input.parseFeedback({...valid,email:'  '}).value.email,null,'blank email means no email');
assert.equal(input.parseFeedback({...valid,email:'a@b.it\r\nBcc: x@y.it'}).ok,false,'no header injection through the email');
for(const bad of ['nome esempio@it.it','<a@b.it>','a@b','a@@b.it'])assert.equal(input.validEmail(bad),false,bad);

// Honeypot: a filled hidden field marks the report as spam (the API answers OK and saves nothing).
assert.equal(input.parseFeedback({...valid,sito:'https://spam.example'}).spam,true);

// Cleaning: control and direction characters removed, line endings unified, text kept as text.
assert.equal(input.cleanText(' a\u0000b\r\nc‮d​ '),'ab\ncd');
assert.equal(input.cleanText('<b>ciao</b>\n\n\n\n\nfine'),'<b>ciao</b>\n\n\nfine','markup is kept as plain text (React shows it as text)');

// Page and edition: only addresses of this site, never admin, API or other sites.
assert.equal(input.cleanPath('/spell/palla-di-fuoco'),'/spell/palla-di-fuoco');
assert.equal(input.cleanPath('/equipaggiamento/armi/'),'/equipaggiamento/armi');
assert.equal(input.cleanPath('/'),'/');
for(const bad of ['https://evil.example/x','//evil.example','/admin','/admin/segnalazioni','/api/analytics','/segnala','/spell/x?y=1','/spell/<script>','spell/x',42,'/'+'a'.repeat(200)])
 assert.equal(input.cleanPath(bad),null,String(bad));
assert.equal(input.cleanEdition('2014'),'2014');assert.equal(input.cleanEdition('1999'),null);

// Email subject: type and checked address only, never the visitor's text.
assert.equal(input.feedbackSubject('mancanza','/bestiario'),'[Grimorio] Mancanza · /bestiario');
assert.equal(input.feedbackSubject('consiglio',null),'[Grimorio] Consiglio · nessuna pagina');
assert.equal(input.aboutLabel('Palla di fuoco','/spell/palla-di-fuoco','2024'),'Palla di fuoco (2024)');

// Dates in the admin list.
const now=new Date('2026-10-21T13:00:00Z');
assert.equal(input.formatWhen(new Date('2026-10-21T13:12:00Z'),now),'oggi 15:12');
assert.equal(input.formatWhen(new Date('2026-10-20T19:05:00Z'),now),'ieri 21:05');
assert.equal(input.formatWhen(new Date('2026-10-19T10:00:00Z'),now),'19 ott');

(async()=>{
 const pg=new PGlite();
 deps['./db']={pool:{query:(sql,params)=>pg.query(sql,params).then(res=>({...res,rowCount:res.affectedRows??res.rows.length}))}};
 process.env.ADMIN_PASSCODE='segreto-di-prova';
 delete process.env.FEEDBACK_SECRET;delete process.env.ANALYTICS_SECRET;
 const fb=load('lib/feedback.ts');

 // Minimum time: the signed token is refused in the first 3 seconds, forged or expired tokens always.
 const t0=1_800_000_000_000,token=fb.issueFormToken(t0);
 assert.equal(fb.checkFormToken(token,t0+1000),'too-fast');
 assert.equal(fb.checkFormToken(token,t0+3000),'ok');
 assert.equal(fb.checkFormToken(token,t0+25*3600*1000),'expired');
 assert.equal(fb.checkFormToken(token.replace(/.$/,c=>c==='0'?'1':'0'),t0+5000),'invalid');
 assert.equal(fb.checkFormToken(`f1.${t0-60000}.${token.split('.')[2]}`,t0+5000),'invalid','the time cannot be moved back');
 assert.equal(fb.checkFormToken('',t0),'invalid');

 // Device key: salted hash, never the address; x-real-ip first, as Vercel sets it.
 const key=fb.deviceKey(new Headers({'x-real-ip':'203.0.113.7','x-forwarded-for':'198.51.100.1'}));
 assert.match(key,/^[0-9a-f]{64}$/);assert.ok(!key.includes('203'));
 assert.equal(key,fb.deviceKey(new Headers({'x-forwarded-for':'203.0.113.7, 10.0.0.1'})));
 assert.notEqual(key,fb.deviceKey(new Headers({'x-real-ip':'203.0.113.8'})));

 // Send limit: 5 an hour from one device, 20 a day, 60 an hour overall.
 for(let i=0;i<5;i++){assert.equal(await fb.feedbackLimited(key),false);await fb.recordFeedbackSend(key);}
 assert.equal(await fb.feedbackLimited(key),true,'sixth report in an hour refused');
 const other=fb.deviceKey(new Headers({'x-real-ip':'203.0.113.9'}));
 assert.equal(await fb.feedbackLimited(other),false,'other devices are not affected');
 await pg.query("UPDATE grimorio_feedback_limits SET sent_at = now() - interval '2 hours'");
 for(let i=0;i<15;i++)await fb.recordFeedbackSend(key);
 await pg.query("UPDATE grimorio_feedback_limits SET sent_at = now() - interval '2 hours'");
 assert.equal(await fb.feedbackLimited(key),true,'twenty in a day refused');
 await pg.query("UPDATE grimorio_feedback_limits SET sent_at = now() - interval '25 hours'");
 await fb.recordFeedbackSend(other);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM grimorio_feedback_limits')).rows[0].n,1,'hashes older than a day are deleted');
 for(let i=0;i<59;i++)await fb.recordFeedbackSend(`k${i}`);
 assert.equal(await fb.feedbackLimited(fb.deviceKey(new Headers({'x-real-ip':'192.0.2.1'}))),true,'overall limit of 60 an hour');
 await pg.query('DELETE FROM grimorio_feedback_limits');

 // Saved columns: no address, no browser.
 const report=await fb.saveFeedback(r.value);
 const columns=(await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name='grimorio_feedback_reports'")).rows.map(c=>c.column_name).sort();
 assert.deepEqual(columns,['creato_il','edizione','email_inviata','email_risposta','id','messaggio','nota_admin','percorso','stato','tipo']);
 assert.equal(report.stato,'nuova');assert.equal(report.email_inviata,false);

 // Email without RESEND_API_KEY: nothing sent, a warning, the report stays saved.
 delete process.env.RESEND_API_KEY;process.env.FEEDBACK_TO_EMAIL='admin@example.com';
 const warnings=[];const warn=console.warn;console.warn=m=>warnings.push(m);
 let calls=[];const fakeFetch=async(url,init)=>{calls.push({url,init});return {ok:true,status:200};};
 assert.equal(await fb.sendFeedbackEmail(report,{origin:'https://ilgrimorio.app',name:'Palla di fuoco'},fakeFetch),'not-configured');
 assert.equal(calls.length,0);assert.match(warnings[0],/RESEND_API_KEY/);
 assert.ok(!warnings[0].includes('admin@example.com'),'the recipient is never logged');

 // Email with Resend (simulated): test sender, subject without user text, reply-to, admin link.
 process.env.RESEND_API_KEY='re_prova';delete process.env.FEEDBACK_FROM_EMAIL;
 const withEmail=await fb.saveFeedback({...r.value,tipo:'consiglio',messaggio:'Oggetto: ciao\nSecondo rigo del messaggio.',email:'lettore@esempio.it'});
 assert.equal(await fb.sendFeedbackEmail(withEmail,{origin:'https://ilgrimorio.app',name:'Palla di fuoco'},fakeFetch),'sent');
 const sent=JSON.parse(calls[0].init.body);
 assert.equal(calls[0].url,'https://api.resend.com/emails');
 assert.equal(calls[0].init.headers.Authorization,'Bearer re_prova');
 assert.equal(sent.from,fb.RESEND_TEST_SENDER);
 assert.deepEqual(sent.to,['admin@example.com']);
 assert.equal(sent.subject,'[Grimorio] Consiglio · /spell/palla-di-fuoco');
 assert.equal(sent.reply_to,'lettore@esempio.it');
 assert.match(sent.text,/Tipo: Consiglio\nRiguarda: Palla di fuoco \(2024\)\nData e ora: .+\nEmail per la risposta: lettore@esempio\.it\n\nMessaggio:\nOggetto: ciao\nSecondo rigo del messaggio\.\n\nApri nell'amministrazione: https:\/\/ilgrimorio\.app\/admin\/segnalazioni\/[0-9a-f-]{36}$/);
 calls=[];
 assert.equal(await fb.sendFeedbackEmail(report,{origin:'https://ilgrimorio.app',name:null},fakeFetch),'sent');
 assert.equal('reply_to' in JSON.parse(calls[0].init.body),false,'no reply-to without an email');
 process.env.FEEDBACK_FROM_EMAIL='Grimorio <avvisi@ilgrimorio.app>';calls=[];
 await fb.sendFeedbackEmail(report,{origin:'https://ilgrimorio.app',name:null},fakeFetch);
 assert.equal(JSON.parse(calls[0].init.body).from,'Grimorio <avvisi@ilgrimorio.app>');
 // Resend refusing or unreachable: "failed", never an exception.
 assert.equal(await fb.sendFeedbackEmail(report,{origin:'x',name:null},async()=>({ok:false,status:403,json:async()=>({name:'validation_error',message:'You can only send testing emails to your own email address (admin@example.com)'})})),'failed');
 assert.match(warnings.at(-1),/Resend ha risposto 403 \(validation_error\)/);
 assert.ok(!warnings.at(-1).includes('admin@example.com'),'the Resend message with the address is not logged');
 assert.equal(await fb.sendFeedbackEmail(report,{origin:'x',name:null},async()=>({ok:false,status:500,json:async()=>{throw new Error('not json');}})),'failed');
 assert.equal(await fb.sendFeedbackEmail(report,{origin:'x',name:null},async()=>{throw new Error('rete');}),'failed');
 console.warn=warn;

 // Admin: list newest first, filters, open marks read, state, note, deletion.
 await fb.markEmailSent(withEmail.id);
 let list=await fb.listFeedback();
 assert.equal(list.reports.length,2);assert.equal(list.nuove,2);
 assert.equal(list.reports[0].id,withEmail.id,'newest first');
 assert.equal(list.reports[0].email_inviata,true);assert.equal(list.reports[1].email_inviata,false,'unsent email is recognisable');
 assert.equal((await fb.listFeedback({tipo:'consiglio'})).reports.length,1);
 await fb.markFeedbackRead(report.id);
 assert.equal((await fb.getFeedback(report.id)).stato,'letta');
 assert.equal(await fb.countNewFeedback(),1);
 assert.equal(await fb.setFeedbackState(report.id,'risolta'),true);
 assert.equal((await fb.listFeedback({stato:'risolta'})).reports.length,1);
 await fb.markFeedbackRead(report.id);
 assert.equal((await fb.getFeedback(report.id)).stato,'risolta','reopening does not undo a later state');
 assert.equal(await fb.setFeedbackNote(report.id,'Verificare sul PDF, p. 241'),true);
 assert.equal((await fb.getFeedback(report.id)).nota_admin,'Verificare sul PDF, p. 241');
 assert.equal(await fb.getFeedback('not-a-uuid'),null);
 assert.equal(await fb.setFeedbackState('11111111-1111-4111-8111-111111111111','letta'),false);
 assert.equal(await fb.deleteFeedback(report.id),true);
 assert.equal(await fb.getFeedback(report.id),null);

 // Turnstile: off without keys; with keys the token is checked by Cloudflare (simulated).
 assert.equal(fb.turnstileConfigured(),false);assert.equal(await fb.turnstilePassed(undefined),true);
 process.env.TURNSTILE_SITE_KEY='site';process.env.TURNSTILE_SECRET_KEY='secret';
 assert.equal(await fb.turnstilePassed('',async()=>({json:async()=>({success:true})})),false);
 assert.equal(await fb.turnstilePassed('tok',async()=>({json:async()=>({success:true})})),true);
 assert.equal(await fb.turnstilePassed('tok',async()=>({json:async()=>({success:false})})),false);
 await pg.close();
 console.log('Segnalazioni: validation, honeypot, minimum time, send limits, cleaning, storage without IP, email via Resend (simulated) and without key, admin states.');
})().catch(error=>{console.error(error);process.exit(1);});
