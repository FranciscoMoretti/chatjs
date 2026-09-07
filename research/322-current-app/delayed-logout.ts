import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const title='Delayed History '+Date.now();
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r});let captured=false,held=0,closed=0;
try{
 await page.route('**/api/trpc/**',async route=>{
  if(!captured&&route.request().url().includes('getAllChats')){captured=true;const response=await route.fetch();held++;await gate;try{await route.fulfill({response})}catch{closed++}}
  else await route.continue();
 });
 await page.goto('http://localhost:6320/api/dev-login');
 await page.getByRole('button',{name:'Expand sidebar'}).click();
 await page.waitForFunction(()=>document.body.textContent?.includes('Dev User'));
 await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('menuitem',{name:'Rename',exact:true}).click();
 await page.getByRole('textbox').first().fill(title);
 await page.getByRole('textbox').first().press('Enter');
 for(let i=0;i<100&&held===0;i++)await page.waitForTimeout(50);
 assert.equal(held,1,'actual history response held');
 await page.getByRole('button',{name:/Dev User/}).focus();
 await page.keyboard.press('Enter');
 await page.getByRole('menuitem',{name:'Log out'}).click();
 await page.getByRole('link',{name:'Sign In',exact:true}).waitFor();
 release();await page.waitForTimeout(300);
 assert.equal(await page.getByText(title,{exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:/Dev User/}).count(),0);
 await page.screenshot({path:'/tmp/322-delayed-after.png'});
 console.log(JSON.stringify({pass:true,heldActualResponses:held,closedRouteAfterNavigation:closed,scope:'actual history response held during normal logout; no old history/user after release'}));
}catch(e){console.log((await page.locator('body').innerText()).slice(-5000));throw e}finally{release();await browser.close()}
