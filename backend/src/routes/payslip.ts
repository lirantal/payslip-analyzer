import { Hono } from 'hono'
import { getSession } from '../lib/auth-helpers'
import type { Database } from '../db'
import { payslipAnalysis } from '../db/schema'
import { payslipResponseFromDevFixture, usePayslipAnalyzeFixture } from '../payslip/dev-fixture'
import { runPayslipPipeline } from '../payslip/pipeline'
import { getMimeTypeFromFilename } from '../payslip/mime'

const payslip = new Hono<{
  Bindings: Env
  Variables: { db?: Database; session?: unknown }
}>()

payslip.post('/analyze', async (c) => {
  const session = await getSession(c)
  if (!session) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const useFixture = usePayslipAnalyzeFixture(c.env)
  const geminiKey = c.env.GEMINI_API_KEY
  if (!useFixture && !geminiKey?.trim()) {
    return c.json({ error: 'GEMINI_API_KEY is not configured' }, 500)
  }

  const db = c.get('db')
  if (!db) {
    return c.json({ error: 'Database connection not available' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await c.req.parseBody()
  } catch {
    return c.json({ error: 'Expected multipart form data' }, 400)
  }

  const file = body.file
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Missing form field "file" (must be a file upload)' }, 400)
  }

  const declaredMime = getMimeTypeFromFilename(file.name)
  if (!declaredMime) {
    return c.json(
      { error: 'Unsupported file type (use PNG, JPEG, or WebP; PDF is not accepted — rasterize client-side)' },
      400,
    )
  }

  const buf = new Uint8Array(await file.arrayBuffer())
  const id = crypto.randomUUID()
  const disableRefine = c.env.DISABLE_NEKUDOT_REFINE === 'true' || c.env.DISABLE_NEKUDOT_REFINE === '1'

  try {
    const result = useFixture
      ? await payslipResponseFromDevFixture(buf, file.name)
      : await runPayslipPipeline(buf, file.name, {
          geminiApiKey: geminiKey!,
          disableNekudotRefine: disableRefine,
        })

    if (useFixture) {
      console.log('Using fixture response')
    }

    await db.insert(payslipAnalysis).values({
      id,
      userId: session.user.id,
      originalFilename: file.name,
      mimeType: result.meta.mimeType,
      status: 'success',
      analysisJson: result.analysis,
      featureMetaJson: {
        featureLogs: result.featureLogs,
        annotationSpecs: result.annotationSpecs,
      },
      error: null,
    })

    return c.json({
      analysis: result.analysis,
      featureLogs: result.featureLogs,
      annotationSpecs: result.annotationSpecs,
      meta: result.meta,
      recordId: id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    await db.insert(payslipAnalysis).values({
      id,
      userId: session.user.id,
      originalFilename: file.name,
      mimeType: declaredMime,
      status: 'error',
      analysisJson: null,
      featureMetaJson: null,
      error: message,
    })
    console.error('Payslip analyze error:', err)
    return c.json({ error: message }, 500)
  }
})

export default payslip
