import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'requirements-boundaries.spec.ts',workers:1,use:{baseURL:'http://127.0.0.1:55547',headless:true},reporter:'json'});
