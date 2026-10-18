import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'final-audit-replay.spec.ts',timeout:20000,workers:1,use:{baseURL:'http://127.0.0.1:55547',headless:true},reporter:'json'});
