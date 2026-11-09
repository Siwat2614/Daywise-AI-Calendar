import {createClient} from './supabase-bundle.js';
import {validateBackup} from './planner.js';
export async function makeCloud(config){
 if(!config?.url||!config?.key)return null;
 const client=createClient(config.url,config.key);
 return {
  async session(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session;},
  async signup(email,password){const {data,error}=await client.auth.signUp({email,password});if(error)throw error;return data;},
  async login(email,password){const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data.session;},
  async logout(){const {error}=await client.auth.signOut();if(error)throw error;},
  async list(user){let rows=[];for(let offset=0;offset<=10000;offset+=500){const {data,error}=await client.from('daywise_events').select('id,data').eq('user_id',user.id).order('id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}return validateBackup({format:'daywise-backup',version:1,events:rows.map(row=>({...row.data,id:row.id}))});},
  async save(user,previous,next){
   const prior=new Map(previous.map(event=>[event.id,JSON.stringify(event)])),nextIds=new Set(next.map(event=>event.id));
   const changed=next.filter(event=>prior.get(event.id)!==JSON.stringify(event));const removed=previous.filter(event=>!nextIds.has(event.id)).map(event=>event.id);
   if(changed.length){const {error}=await client.from('daywise_events').upsert(changed.map(event=>({user_id:user.id,id:event.id,data:event,updated_at:new Date().toISOString()})),{onConflict:'user_id,id'});if(error)throw error;}
   if(removed.length){const {error}=await client.from('daywise_events').delete().eq('user_id',user.id).in('id',removed);if(error)throw error;}
  }
 };
}
