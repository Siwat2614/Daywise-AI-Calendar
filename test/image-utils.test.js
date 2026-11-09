import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImageFile,prepareImage} from '../public/image-utils.js';
test('accepts images up to 20 MB and identifies invalid files',()=>{
 assert.doesNotThrow(()=>validateImageFile({type:'image/png',size:3*1024*1024}));
 assert.throws(()=>validateImageFile({type:'application/pdf',size:100}),/ชนิดไฟล์/);
 assert.throws(()=>validateImageFile({type:'image/png',size:21*1024*1024}),/20 MB/);
 assert.throws(()=>validateImageFile({type:'image/png',size:0}),/ว่างเปล่า/);
});
test('compresses large images before sending them',async t=>{
 const saved={Image:globalThis.Image,FileReader:globalThis.FileReader,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let revoked=false;
 t.after(()=>{globalThis.Image=saved.Image;globalThis.FileReader=saved.FileReader;globalThis.document=saved.document;URL.createObjectURL=saved.create;URL.revokeObjectURL=saved.revoke;});
 globalThis.Image=class{naturalWidth=4000;naturalHeight=2000;async decode(){}};
 globalThis.FileReader=class{readAsDataURL(){this.result='data:image/jpeg;base64,YWJj';this.onload();}};
 URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{revoked=true;};
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toBlob:callback=>callback({size:1000})})};
 const result=await prepareImage({type:'image/png',size:3*1024*1024});
 assert.equal(result.compressed,true);assert.deepEqual(result.image,{mimeType:'image/jpeg',data:'YWJj'});assert.equal(revoked,true);
});
