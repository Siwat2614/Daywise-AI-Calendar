export function authErrorMessage(error,operation='login'){
 const code=String(error?.code||'').toLowerCase(),message=String(error?.message||'').toLowerCase(),status=Number(error?.status||0);
 if(operation==='load')return 'เข้าสู่ระบบได้แล้ว แต่โหลดปฏิทินไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแล';
 if(code==='email_not_confirmed'||message.includes('email not confirmed'))return 'ยังไม่ได้ยืนยันอีเมล กรุณาเปิดอีเมลยืนยันจาก Daywise หรือ Supabase และตรวจสอบโฟลเดอร์สแปม';
 if(code==='invalid_credentials'||message.includes('invalid login credentials'))return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หากยังไม่เคยสมัครให้กด “สมัครสมาชิก” ก่อน';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||status===429)return 'มีคำขอมากเกินไป กรุณารอสักครู่ก่อนลองอีกครั้ง';
 if(code==='user_already_exists'||message.includes('already registered'))return 'อีเมลนี้อาจเคยสมัครแล้ว กรุณาลองเข้าสู่ระบบหรือยืนยันอีเมล';
 if(code==='weak_password'||message.includes('password should'))return 'รหัสผ่านยังไม่ตรงตามเงื่อนไข กรุณาลองรหัสผ่านที่ยาวและคาดเดายากขึ้น';
 if(error?.name==='AuthRetryableFetchError'||message.includes('failed to fetch')||message.includes('networkerror'))return 'เชื่อมต่อระบบบัญชีไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง';
 return operation==='signup'?'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือทดลองใหม่':'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือทดลองใหม่';
}
