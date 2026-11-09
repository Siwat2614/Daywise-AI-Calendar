const TYPES=['image/jpeg','image/png','image/webp'];
export const MAX_UPLOAD_BYTES=20*1024*1024;
const MAX_AI_BYTES=2*1024*1024;
export function validateImageFile(file){
  if(!TYPES.includes(file.type))throw new Error('ชนิดไฟล์ไม่รองรับ กรุณาเลือกภาพ JPG, PNG หรือ WebP');
  if(!file.size)throw new Error('ไฟล์ภาพว่างเปล่า กรุณาเลือกภาพใหม่');
  if(file.size>MAX_UPLOAD_BYTES)throw new Error('ภาพใหญ่เกิน 20 MB กรุณาเลือกภาพที่เล็กลง');
}
function asDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('อ่านภาพไม่สำเร็จ กรุณาเลือกภาพใหม่'));reader.readAsDataURL(file);});}
export async function prepareImage(file){
  validateImageFile(file);
  if(file.size<=MAX_AI_BYTES){const dataURL=await asDataURL(file);return {image:{mimeType:file.type,data:dataURL.split(',')[1]},compressed:false};}
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;try{await img.decode();}catch{throw new Error('เปิดภาพไม่ได้ กรุณาเลือกไฟล์ภาพอื่น');}
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>50000000)throw new Error('ขนาดภาพใหญ่เกินไป กรุณาเลือกภาพอื่น');
    let scale=Math.min(1,3000/Math.max(img.naturalWidth,img.naturalHeight));
    for(let attempt=0;attempt<5;attempt++){
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('ไม่สามารถย่อภาพได้ในเบราว์เซอร์นี้');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',Math.max(.55,.88-attempt*.08)));if(!blob)throw new Error('ไม่สามารถย่อภาพได้ กรุณาลองภาพอื่น');
      if(blob.size<=MAX_AI_BYTES){const dataURL=await asDataURL(blob);return {image:{mimeType:'image/jpeg',data:dataURL.split(',')[1]},compressed:true};}scale*=.8;
    }
    throw new Error('ภาพมีรายละเอียดมากเกินไป กรุณาย่อภาพหรือตัดเฉพาะส่วนที่ต้องการแล้วลองใหม่');
  }finally{URL.revokeObjectURL(url);}
}
