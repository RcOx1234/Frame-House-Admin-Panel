import { test, expect } from '@playwright/test';
test('anonymous startup loads the login without admin modules or external font requests',async({page})=>{
  const requests:string[]=[];const errors:string[]=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Frame House Admin Panel'})).toBeVisible();
  expect(requests.some(url=>url.includes('/src/pages/AdminPanel'))).toBe(false);
  expect(requests.some(url=>/fonts\.(googleapis|gstatic)\.com/.test(url))).toBe(false);
  expect(errors).toEqual([]);
});
