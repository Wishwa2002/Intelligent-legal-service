import {test,expect} from '@playwright/test';
test('clerk queue uses profile ID when authentication account ID differs',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('token','synthetic-test-token');localStorage.setItem('legalease_staff_user',JSON.stringify({userId:42,clerkId:7,role:'Clerk',name:'Synthetic Clerk',email:'clerk@example.test'}));});
 await page.route('**/api/documentation-requests',route=>route.fulfill({json:[
  {requestId:101,serviceId:1,customerId:1,customerName:'Own Customer',serviceName:'Own Clerk Case',documentType:'Own Clerk Case',status:'ASSIGNED',assignedClerkId:7,documentFiles:[],requiredDocuments:[],missingDocuments:[],createdAt:'2030-01-01T00:00:00Z'},
  {requestId:102,serviceId:1,customerId:2,customerName:'Other Customer',serviceName:'Other Clerk Case',documentType:'Other Clerk Case',status:'ASSIGNED',assignedClerkId:42,documentFiles:[],requiredDocuments:[],missingDocuments:[],createdAt:'2030-01-01T00:00:00Z'}
 ]}));
 await page.goto('/clerk/cases');await expect(page.getByText('Own Clerk Case').first()).toBeVisible();await expect(page.getByText('Other Clerk Case')).toHaveCount(0);
});
test('old clerk session without profile ID requires fresh login',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('token','synthetic-test-token');localStorage.setItem('legalease_staff_user',JSON.stringify({userId:42,role:'Clerk',name:'Synthetic Clerk',email:'clerk@example.test'}));});
 await page.goto('/clerk/cases');await expect(page.getByText('Please sign in again to refresh your session.')).toBeVisible();
});
