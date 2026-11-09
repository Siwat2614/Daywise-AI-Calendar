import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan,createPlan} from '../calendar-core.js';
import {createServer} from '../server.js';
const event={title:'ประชุมทีม',description:'',start_local:'2026-11-08T10:00:00',end_local:'2026-11-08T11:00:00',reminder_minutes:30};
const plan={reply:'ตรวจสอบนัดหมาย',needs_clarification:false,events:[event]};
test('validates dates and allows clear events alongside a clarification',()=>{
 assert.deepEqual(validatePlan(plan),plan);
 assert.equal(validatePlan({...plan,needs_clarification:true}).events.length,1);
 assert.equal(validatePlan({...plan,events:Array(24).fill(event)}).events.length,24);
 assert.throws(()=>validatePlan({...plan,events:Array(51).fill(event)}));
 assert.throws(()=>validatePlan({...plan,events:[{...event,start_local:'2026-02-30T10:00:00'}]}));
 assert.throws(()=>validatePlan({...plan,events:[{...event,end_local:event.start_local}]}));
});
test('sends the given local time and validates AI results',async()=>{
 let body;
 const result=await createPlan({message:'พรุ่งนี้ 10 โมงประชุม',timeZone:'Asia/Bangkok',now:'2026-11-07T03:00:00Z',apiKey:'test',fetchImpl:async(_url,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(plan)}]}}]}));}});
 assert.deepEqual(result,plan);assert.match(body.systemInstruction.parts[0].text,/Asia\/Bangkok/);assert.match(body.systemInstruction.parts[0].text,/2026-11-07/);
 await assert.rejects(()=>createPlan({message:'x',timeZone:'Invalid/Zone',apiKey:'test'}),{status:400});
 await assert.rejects(()=>createPlan({message:'x',timeZone:'Asia/Bangkok',apiKey:'test',fetchImpl:async()=>new Response('',{status:429})}),{status:429});
});
test('accepts an image and rejects invalid image data',async()=>{
 const image={mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')};let body;
 await createPlan({image,message:'',timeZone:'Asia/Bangkok',apiKey:'test',fetchImpl:async(_url,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(plan)}]}}]}));}});
 assert.deepEqual(body.contents[0].parts[1].inline_data,{mime_type:'image/png',data:image.data});
 await assert.rejects(()=>createPlan({image:{mimeType:'image/png',data:'YWJj'},message:'',timeZone:'Asia/Bangkok',apiKey:'test'}),{status:400});
});
test('serves the app and handles real HTTP requests',async t=>{
 const server=createServer({apiKey:'test',fetchImpl:async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(plan)}]}}]}))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/app.js')).status,200);
 assert.equal((await fetch(base+'/api/plan',{method:'POST',body:'bad'})).status,415);
 const response=await fetch(base+'/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'พรุ่งนี้ 10 โมง',timeZone:'Asia/Bangkok'})});assert.equal(response.status,200);assert.deepEqual(await response.json(),plan);
 assert.equal((await fetch(base+'/.env.local')).status,404);
});
test('does not expose a Supabase secret key in client configuration',async t=>{
 const priorUrl=process.env.SUPABASE_URL,priorKey=process.env.SUPABASE_PUBLISHABLE_KEY;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_secret_test';
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.close();if(priorUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=priorUrl;if(priorKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=priorKey;});
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/cloud-config`);assert.equal(await response.json(),null);
});
test('requires a verified account for the online AI endpoint',async t=>{
 const priorUrl=process.env.SUPABASE_URL,priorKey=process.env.SUPABASE_PUBLISHABLE_KEY;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
 const server=createServer({apiKey:'test',requireAuth:true,fetchImpl:async(url,options)=>url.endsWith('/auth/v1/user')?new Response(JSON.stringify({id:'user-one'}),{status:options.headers.Authorization==='Bearer valid-token'?200:401}):new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(plan)}]}}]}))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.close();if(priorUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=priorUrl;if(priorKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=priorKey;});
 const base=`http://127.0.0.1:${server.address().port}/api/plan`,body=JSON.stringify({message:'ประชุม',timeZone:'Asia/Bangkok'});
 for(const token of [undefined,'Bearer invalid-token']){const headers={'Content-Type':'application/json'};if(token)headers.Authorization=token;assert.equal((await fetch(base,{method:'POST',headers,body})).status,401);}
 assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer valid-token'},body})).status,200);
});
