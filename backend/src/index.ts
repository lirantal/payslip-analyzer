import './worker-polyfills'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/better-auth'
import { databaseMiddleware } from './middleware/database'
import profile from './routes/profile'
import payslip from './routes/payslip'
import type { Database } from './db'

const app = new Hono<{ Bindings: Env; Variables: { db?: Database } }>()

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005',
  'https://tlush.pages.dev',
  'http://myapp.com',
]

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0]
      if (allowedOrigins.includes(origin)) return origin
      return allowedOrigins[0]
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', databaseMiddleware)

app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return auth(c.env).handler(c.req.raw)
})

app.route('/api/user', profile)
app.route('/api/payslip', payslip)

app.get('/', (c) => {
  return c.text('Payslip Analyzer API')
})

export default app
