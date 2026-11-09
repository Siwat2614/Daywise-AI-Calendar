import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createPlan} from './calendar-core.js';
const dir=fileURLToPath(new URL('./public/',import.meta.url));
const files=new Map([['/',['index.html','text/html; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']],['/app.js',['app.js','application/javascript; charset=utf-8']],['/planner.js',['planner.js','application/javascript; charset=utf-8']],['/image-utils.js',['image-utils.js','application/javascript; charset=utf-8']],['/cloud.js',['cloud.js','application/javascript; charset=utf-8']],['/auth-errors.js',['auth-errors.js','application/javascript; charset=utf-8']],['/supabase-bundle.js',['supabase-bundle.js','application/javascript; charset=utf-8']]]);
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
export function createServer({apiKey=process.env.GEMINI_API_KEY,fetchImpl=fetch,requireAuth=Boolean(process.env.VERCEL)}={}){
 const cloudUrl=process.env.SUPABASE_URL||'',cloudKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
 let publicKey=cloudKey.startsWith('sb_publishable_');if(!publicKey&&cloudKey.split('.').length===3){try{publicKey=JSON.parse(Buffer.from(cloudKey.split('.')[1],'base64url').toString()).role==='anon';}catch{publicKey=false;}}
 const cloud=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cloudUrl)&&publicKey?{url:cloudUrl,key:cloudKey}:null;
 return http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&files.has(path)){try{const [file,type]=files.get(path);const body=await readFile(join(dir,file));res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ${cloud?cloud.url:''}; frame-src 'none'; img-src 'self' data: blob: https:; base-uri 'none'; frame-ancestors 'none'`});return res.end(body);}catch{return send(res,500,{error:'ไม่สามารถเปิดหน้าเว็บได้'});}}
  if(req.method==='GET'&&path==='/api/cloud-config')return send(res,200,cloud);
  if(req.method!=='POST'||path!=='/api/plan')return send(res,404,{error:'ไม่พบหน้าที่ต้องการ'});
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(res,415,{error:'กรุณาส่งข้อมูลแบบ JSON'});
  if(requireAuth){
   if(!cloud)return send(res,503,{error:'ระบบบัญชียังไม่ได้ตั้งค่า'});
   const auth=String(req.headers.authorization||'');if(!/^Bearer [A-Za-z0-9._-]+$/.test(auth))return send(res,401,{error:'กรุณาเข้าสู่ระบบก่อนใช้ AI'});
   try{const verified=await fetchImpl(cloud.url+'/auth/v1/user',{headers:{apikey:cloud.key,Authorization:auth},signal:AbortSignal.timeout(10000)});if(!verified.ok)return send(res,401,{error:'การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'});const user=await verified.json();if(typeof user.id!=='string'||!user.id)return send(res,401,{error:'กรุณาเข้าสู่ระบบก่อนใช้ AI'});}catch{return send(res,503,{error:'ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'});}
  }
  try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2810000)return send(res,413,{error:'ภาพหรือข้อความมีขนาดใหญ่เกินไป'});}const {message,image,timeZone}=JSON.parse(raw);const plan=await createPlan({message,image,timeZone,apiKey,model:process.env.GEMINI_MODEL||undefined,fetchImpl});return send(res,200,plan);}catch(error){return send(res,error.status||(error instanceof SyntaxError?400:502),{error:error.status?error.message:'ไม่สามารถประมวลผลคำขอได้ กรุณาลองอีกครั้ง'});}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT||3001);createServer().listen(port,'127.0.0.1',()=>console.log(`Smart Calendar running at http://127.0.0.1:${port}`));}
