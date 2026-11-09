import test from 'node:test';
import assert from 'node:assert/strict';
import {conflicts,upcoming,validateBackup} from '../public/planner.js';
const first={id:'one',title:'ประชุม',description:'',start_local:'2026-11-08T10:00',end_local:'2026-11-08T11:00',reminder_minutes:15};
test('identifies overlapping events without flagging adjacent times or the event being edited',()=>{
 assert.equal(conflicts({...first,start_local:'2026-11-08T10:30',end_local:'2026-11-08T11:30'},[first]).length,1);
 assert.equal(conflicts({...first,start_local:'2026-11-08T11:00',end_local:'2026-11-08T12:00'},[first]).length,0);
 assert.equal(conflicts(first,[first],'one').length,0);
});
test('shows the next ongoing or future event',()=>{
 const later={...first,id:'two',start_local:'2026-11-08T12:00',end_local:'2026-11-08T13:00'};
 assert.equal(upcoming([later,first],new Date('2026-11-08T10:30')).id,'one');
 assert.equal(upcoming([later,first],new Date('2026-11-08T11:30')).id,'two');
 assert.equal(upcoming([first],new Date('2026-11-08T12:00')),null);
});
test('validates backup before importing and rejects malformed dates or duplicate IDs',()=>{
 const backup={format:'daywise-backup',version:1,events:[first]};assert.deepEqual(validateBackup(backup),[first]);
 assert.throws(()=>validateBackup({...backup,events:[first,first]}));
 assert.throws(()=>validateBackup({...backup,events:[{...first,start_local:'2026-02-30T10:00'}]}));
 assert.throws(()=>validateBackup({...backup,events:[{...first,title:''}]}));
});
