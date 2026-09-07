import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
const temp = mkdtempSync(join(tmpdir(),'322-current-'));
const pg = process.env.PG_BIN ?? '/opt/homebrew/opt/postgresql@17/bin';
const port=56422; // TCP disabled, unique socket directory
let started=false, checks=0;
async function cmd(args:string[]) {const p=Bun.spawn(args,{stdout:'pipe',stderr:'pipe'});const [o,e,c]=await Promise.all([new Response(p.stdout).text(),new Response(p.stderr).text(),p.exited]);if(c)throw Error(e+o);return o;}
const sql=postgres({host:temp,port,username:userInfo().username,database:'postgres',max:1});
function equal(a:unknown,b:unknown){assert.deepEqual(a,b);checks++;}
try {
 await cmd([join(pg,'initdb'),'-D',join(temp,'data'),'-A','trust','--no-locale']);
 await cmd([join(pg,'pg_ctl'),'-D',join(temp,'data'),'-l',join(temp,'pg.log'),'-o',`-h '' -k ${temp} -p ${port}`,'-w','start']);started=true;
 mock.module('server-only',()=>({}));
 mock.module('@/lib/env',()=>({env:{}}));
 mock.module('@/lib/db/client',()=>({db:drizzle(sql)}));
 mock.module('@/lib/file-storage',()=>({deleteFilesByUrls(){throw Error('unexpected file operation')}}));
 mock.module('@/lib/ai/providers',()=>({getLanguageModel(){throw Error('unexpected model call')}}));
 mock.module('@/lib/ai/telemetry',()=>({chatTelemetry:{}}));
 mock.module('@/lib/clone-messages',()=>({cloneAttachmentsInMessages(){throw Error('unexpected clone')},cloneMessagesWithDocuments(){throw Error('unexpected clone')}}));
 mock.module('@/lib/auth',()=>({auth:{api:{getSession(){throw Error('identity injected into actual caller; no live auth')}}}}));
 await sql.unsafe(`CREATE TABLE "Chat" (id uuid PRIMARY KEY, "createdAt" timestamp NOT NULL,"updatedAt" timestamp NOT NULL,title text NOT NULL,"userId" text NOT NULL,visibility varchar NOT NULL,"isPinned" boolean NOT NULL,"projectId" uuid)`);
 const project=crypto.randomUUID();const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
 for(const [i,id] of ids.entries())await sql`INSERT INTO "Chat" VALUES(${id},${new Date('2026-01-01')},${new Date(2026,0,i+1)},${'row'+i},${i===3?'bob':'alice'},'private',${i===0},${i===1?project:null})`;
 const {getChatsByUserId}=await import('./lib/db/queries');
 equal((await getChatsByUserId({id:'alice'})).map(x=>x.id),[ids[2],ids[1],ids[0]]);
 equal((await getChatsByUserId({id:'alice',projectId:null})).map(x=>x.id),[ids[2],ids[0]]);
 equal((await getChatsByUserId({id:'alice',projectId:project})).map(x=>x.id),[ids[1]]);
 equal((await getChatsByUserId({id:'bob',projectId:project})).length,0);
 const {chatRouter}=await import('./trpc/routers/chat.router');
 const alice=chatRouter.createCaller({user:{id:'alice',email:'a@example.test',name:'Alice',emailVerified:true,createdAt:new Date(),updatedAt:new Date()}});
 equal((await alice.getAllChats()).map(x=>x.id),[ids[0],ids[2],ids[1]]);
 equal((await alice.getAllChats({projectId:null})).map(x=>x.id),[ids[0],ids[2]]);
 equal((await alice.getAllChats({projectId:project})).map(x=>x.id),[ids[1]]);
 await assert.rejects(alice.getChatById({chatId:ids[3]!}),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='NOT_FOUND');checks++;
 const guest=chatRouter.createCaller({user:undefined});
 await assert.rejects(guest.getAllChats(),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='UNAUTHORIZED');checks++;
 equal(await alice.renameChat({chatId:ids[0]!,title:'Renamed'}),undefined);
 equal((await alice.getChatById({chatId:ids[0]!})).title,'Renamed');
 equal(await alice.setIsPinned({chatId:ids[0]!,isPinned:false}),{success:true});
 equal((await alice.getChatById({chatId:ids[0]!})).isPinned,false);
 await assert.rejects(alice.renameChat({chatId:ids[3]!,title:'Stolen'}));checks++;
 await assert.rejects(alice.setIsPinned({chatId:ids[3]!,isPinned:true}),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='NOT_FOUND');checks++;
 equal((await sql`SELECT title,"isPinned" FROM "Chat" WHERE id=${ids[3]}`)[0],{title:'row3',isPinned:false});
 await assert.rejects(alice.renameChat({chatId:ids[0]!,title:''}),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='BAD_REQUEST');checks++;
 await assert.rejects(alice.renameChat({chatId:ids[0]!,title:'x'.repeat(256)}),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='BAD_REQUEST');checks++;
 await assert.rejects(guest.renameChat({chatId:ids[0]!,title:'Guest'}),e=>typeof e==='object'&&e!==null&&'code' in e&&e.code==='UNAUTHORIZED');checks++;
 console.log(JSON.stringify({passed:checks,source:'8178650771aed69e75421a988e6c57f69ac131ca',scope:'actual production query + router + protected middleware; injected identity, real isolated Postgres',limits:['minimal Chat test schema without FK/migrations','no HTTP or browser','no live authentication']}));
} finally {await sql.end();if(started)await cmd([join(pg,'pg_ctl'),'-D',join(temp,'data'),'-m','fast','-w','stop']);rmSync(temp,{recursive:true,force:true});}
