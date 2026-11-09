export function conflicts(candidate, events, excludeId=null) {
  return events.filter(event => event.id !== excludeId && candidate.start_local < event.end_local && candidate.end_local > event.start_local);
}
export function upcoming(events, now = new Date()) {
  return events.filter(event => new Date(event.end_local).getTime() > now.getTime()).sort((a,b) => a.start_local.localeCompare(b.start_local))[0] || null;
}
function validDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false;
  const date = new Date(value); return !Number.isNaN(date.valueOf()) && date.getFullYear()===Number(value.slice(0,4)) && date.getMonth()+1===Number(value.slice(5,7)) && date.getDate()===Number(value.slice(8,10)) && date.getHours()===Number(value.slice(11,13)) && date.getMinutes()===Number(value.slice(14,16));
}
export function validateBackup(data) {
  if(!data || data.format!=='daywise-backup' || data.version!==1 || !Array.isArray(data.events) || data.events.length>10000) throw new Error('ไฟล์สำรองไม่ถูกต้อง');
  const seen=new Set();return data.events.map(event=>{
    if(!event || typeof event.id!=='string' || !event.id || event.id.length>100 || seen.has(event.id) || typeof event.title!=='string' || !event.title.trim() || event.title.length>140 || typeof event.description!=='string' || event.description.length>1500 || !validDate(event.start_local) || !validDate(event.end_local) || event.end_local<=event.start_local || !Number.isInteger(event.reminder_minutes) || event.reminder_minutes<0 || event.reminder_minutes>40320)throw new Error('ข้อมูลกิจกรรมในไฟล์สำรองไม่ถูกต้อง');
    seen.add(event.id);return {id:event.id,title:event.title,description:event.description,start_local:event.start_local,end_local:event.end_local,reminder_minutes:event.reminder_minutes};
  });
}
