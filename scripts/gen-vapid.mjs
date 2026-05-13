#!/usr/bin/env node
/* eslint-disable */
// Sinh VAPID keys cho Web Push. Chạy 1 lần, copy ra .env.
// Usage: pnpm vapid:gen
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Copy 3 dòng dưới vào file .env:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@example.com`);
console.log("\n(Đổi mailto thành email của bạn)");
