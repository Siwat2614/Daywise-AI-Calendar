const schema={type:'object',properties:{reply:{type:'string'},needs_clarification:{type:'boolean'},events:{type:'array',items:{type:'object',properties:{title:{type:'string'},description:{type:'string'},start_local:{type:'string'},end_local:{type:'string'},reminder_minutes:{type:'integer'}},required:['title','description','start_local','end_local','reminder_minutes'],additionalProperties:false}}},required:['reply','needs_clarification','events'],additionalProperties:false};

function validLocal(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value))return false;
  const d=new Date(value+'Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,19)===value;
}
export function validatePlan(data){
  if(!data||typeof data.reply!=='string'||typeof data.needs_clarification!=='boolean'||!Array.isArray(data.events)||data.events.length>50)throw new Error('invalid plan');
  const events=data.events.map(event=>{
    if(typeof event.title!=='string'||!event.title.trim()||event.title.length>140||typeof event.description!=='string'||event.description.length>1500||!validLocal(event.start_local)||!validLocal(event.end_local)||event.end_local<=event.start_local||!Number.isInteger(event.reminder_minutes)||event.reminder_minutes<0||event.reminder_minutes>40320)throw new Error('invalid event');
    return {title:event.title.trim(),description:event.description,start_local:event.start_local,end_local:event.end_local,reminder_minutes:event.reminder_minutes};
  });
  return {reply:data.reply.slice(0,2000),needs_clarification:data.needs_clarification,events};
}

export async function createPlan({message='',image,timeZone,now,apiKey,model='gemini-3.5-flash-lite',fetchImpl=fetch}){
  if(typeof message!=='string'||message.length>2000||(!message.trim()&&!image))throw Object.assign(new Error('กรุณาพิมพ์ข้อความหรือแนบภาพ'),{status:400});
  if(image){
    const valid=image&&typeof image==='object'&&['image/jpeg','image/png','image/webp'].includes(image.mimeType)&&typeof image.data==='string'&&image.data.length<=2796204&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data);
    if(!valid)throw Object.assign(new Error('กรุณาแนบภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB'),{status:400});
    const bytes=Buffer.from(image.data,'base64'); const signature=image.mimeType==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):image.mimeType==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
    if(!signature||bytes.length>2*1024*1024)throw Object.assign(new Error('ไฟล์ภาพไม่ถูกต้องหรือมีขนาดเกิน 2 MB'),{status:400});
  }
  try{new Intl.DateTimeFormat('en',{timeZone}).format(new Date());}catch{throw Object.assign(new Error('เขตเวลาไม่ถูกต้อง'),{status:400});}
  if(!apiKey||apiKey==='replace_with_your_key')throw Object.assign(new Error('ระบบ AI ยังไม่ได้ตั้งค่า'),{status:503});
  if(!/^[a-zA-Z0-9._-]+$/.test(model))throw Object.assign(new Error('ตั้งค่ารุ่น AI ไม่ถูกต้อง'),{status:503});
  const instant=new Date(now||Date.now());if(Number.isNaN(instant.valueOf()))throw Object.assign(new Error('เวลาอ้างอิงไม่ถูกต้อง'),{status:400});
  const current=new Intl.DateTimeFormat('sv-SE',{timeZone,dateStyle:'full',timeStyle:'long'}).format(instant);
  const instructions=`คุณเป็นผู้ช่วยร่างกิจกรรมปฏิทิน คืน JSON ตาม schema เท่านั้น กิจกรรมยังไม่ได้บันทึก ห้ามกล่าวว่าบันทึกหรือสร้างในปฏิทินแล้ว ให้บอกว่าเป็นร่างรอผู้ใช้ตรวจสอบ ระบบนี้ยังไม่สามารถส่งการแจ้งเตือนได้ ค่า reminder_minutes เป็นเพียงข้อมูลที่เก็บไว้ ห้ามบอกว่าตั้งเตือนแล้วหรือจะได้รับการแจ้งเตือน หากผู้ใช้ขอการเตือนให้ระบุว่ายังไม่รองรับ ห้ามแต่งรายละเอียดเพิ่มเติมที่ผู้ใช้ไม่ได้ระบุ เวลาอ้างอิงปัจจุบันในเขตเวลา ${timeZone} คือ ${current} (ISO UTC ${instant.toISOString()}) วันที่ พ.ศ. แปลงเป็น ค.ศ. ให้ถูกต้อง ระบุ start_local/end_local เป็นเวลาท้องถิ่นในรูป YYYY-MM-DDTHH:mm:ss โดยไม่ใส่ timezone หรือ offset หากภาพหรือตารางมีหลายรายการให้ร่างทุกรายการที่มีวันที่และเวลาเริ่มชัดเจน แม้วันนั้นจะผ่านไปแล้ว ผู้ใช้จะตรวจสอบและยืนยันก่อนบันทึก ถ้าบางรายการวันหรือเวลาเริ่มไม่ชัดเจน ให้ข้ามเฉพาะรายการนั้น ระบุสิ่งที่อ่านไม่ได้ใน reply และ needs_clarification=true อย่าเดาวันหรือเวลา ถ้าไม่ได้ระบุระยะเวลาให้ใช้ 1 ชั่วโมงและบอกใน reply ว่าใช้ 1 ชั่วโมงเป็นค่าเริ่มต้น ถ้าไม่ได้ระบุเวลาแจ้งเตือนให้ใส่ค่า reminder_minutes 15 ไว้ในข้อมูลร่าง ไม่ส่งผู้เข้าร่วม ลิงก์ ประชุม หรืออีเมลเชิญ จำกัดผลลัพธ์ไม่เกิน 50 กิจกรรม หากมากกว่านั้นให้ระบุว่าไม่ได้ร่างครบและให้ผู้ใช้แบ่งตาราง ตอบภาษาเดียวกับผู้ใช้`;
  const parts=[{text:message.trim()||'อ่านภาพและร่างกิจกรรมจากวันและเวลาที่ปรากฏในภาพ หากอ่านไม่ชัดให้ถามกลับ'}];if(image)parts.push({inline_data:{mime_type:image.mimeType,data:image.data}});
  const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},signal:AbortSignal.timeout(90000),body:JSON.stringify({systemInstruction:{parts:[{text:instructions+' เมื่อมีภาพให้สรุปสิ่งที่อ่านได้และจำนวนรายการที่ร่างใน reply หากภาพอ่านวันหรือเวลาไม่ชัด ให้ถามกลับ ห้ามเดา'}]},contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:16384}})});
  if(response.status===429)throw Object.assign(new Error('โควตา AI เต็ม กรุณาลองใหม่ภายหลัง'),{status:429});
  if(!response.ok)throw Object.assign(new Error('เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่'),{status:502});
  const data=await response.json();const text=(data.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('');
  try{return validatePlan(JSON.parse(text));}catch{throw Object.assign(new Error('AI ส่งข้อมูลไม่ครบ กรุณาลองระบุวันและเวลาอีกครั้ง'),{status:502});}
}
