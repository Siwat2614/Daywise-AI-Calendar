import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../public/auth-errors.js';
test('explains common login failures without showing passwords or raw errors',()=>{
 assert.match(authErrorMessage({code:'email_not_confirmed'}),/ยืนยันอีเมล/);
 assert.match(authErrorMessage({code:'invalid_credentials'}),/อีเมลหรือรหัสผ่านไม่ถูกต้อง/);
 assert.match(authErrorMessage({status:429}),/มากเกินไป/);
 assert.match(authErrorMessage({name:'AuthRetryableFetchError'}),/อินเทอร์เน็ต/);
 assert.match(authErrorMessage({},'load'),/เข้าสู่ระบบได้แล้ว/);
 assert.doesNotMatch(authErrorMessage({message:'secret_example'}),/secret_example/);
});
