#!/usr/bin/env node
/**
 * Sign in (email + password) and POST a payslip to POST /api/payslip/analyze.
 *
 * Env (via --env-file=.env):
 *   API_BASE_URL          — default http://127.0.0.1:8787
 *   PAYSLIP_TEST_EMAIL   — or TEST_EMAIL
 *   PAYSLIP_TEST_PASSWORD — or TEST_PASSWORD
 *   PAYSLIP_SCRIPT_ORIGIN — Origin header for Better Auth CSRF (default http://localhost:3000; must match trustedOrigins / CORS)
 *
 * Upload must be a raster image (PNG / JPEG / WebP). PDF is not supported — convert client-side.
 *
 * Usage:
 *   pnpm run analyze-payslip-remote -- path/to/payslip.png
 */

import fs from 'fs'
import path from 'path'

const base = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
/** Node fetch omits Origin; Better Auth rejects sign-in without it (MISSING_OR_NULL_ORIGIN). */
const scriptOrigin =
  (process.env.PAYSLIP_SCRIPT_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '')
const email = process.env.PAYSLIP_TEST_EMAIL ?? process.env.TEST_EMAIL
const password = process.env.PAYSLIP_TEST_PASSWORD ?? process.env.TEST_PASSWORD

let cliArgs = process.argv.slice(2)
while (cliArgs[0] === '--') cliArgs = cliArgs.slice(1)
const filePath = cliArgs[0] ?? process.env.PAYSLIP_TEST_FILE

if (!email || !password) {
  console.error('Set PAYSLIP_TEST_EMAIL and PAYSLIP_TEST_PASSWORD (or TEST_EMAIL / TEST_PASSWORD) in .env')
  process.exit(1)
}

if (!filePath || !fs.existsSync(filePath)) {
  console.error('Usage: pnpm run analyze-payslip-remote -- <path-to-payslip-file>')
  process.exit(1)
}

const signInRes = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: scriptOrigin,
  },
  body: JSON.stringify({ email, password }),
})

if (!signInRes.ok) {
  console.error('Sign-in failed', signInRes.status, await signInRes.text())
  process.exit(1)
}

const headersObj = signInRes.headers as Headers & { getSetCookie?: () => string[] }
const cookieHeader =
  typeof headersObj.getSetCookie === 'function'
    ? headersObj.getSetCookie().join('; ')
    : signInRes.headers.get('set-cookie') ?? ''

const buf = fs.readFileSync(filePath)
const form = new FormData()
form.append('file', new Blob([buf]), path.basename(filePath))

const analyzeHeaders: Record<string, string> = { Origin: scriptOrigin }
if (cookieHeader) analyzeHeaders.Cookie = cookieHeader

const analyzeRes = await fetch(`${base}/api/payslip/analyze`, {
  method: 'POST',
  headers: analyzeHeaders,
  body: form,
})

const text = await analyzeRes.text()
if (!analyzeRes.ok) {
  console.error(analyzeRes.status, text)
  process.exit(1)
}

const json = JSON.parse(text) as Record<string, unknown>
console.log(JSON.stringify(json, null, 2))
