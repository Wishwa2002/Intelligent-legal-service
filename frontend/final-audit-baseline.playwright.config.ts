import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',testIgnore:['**/requirements-boundaries.spec.ts','**/historical-acceptance.spec.ts','**/final-audit-replay.spec.ts','**/final-audit-contract.spec.ts'],workers:2,use:{baseURL:'http://127.0.0.1:55547',headless:true},reporter:'json'});
