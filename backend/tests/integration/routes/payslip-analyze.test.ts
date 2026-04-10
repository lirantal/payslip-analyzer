import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestAppWithPayslip,
  createMockSession,
  createTestUser,
  testWorkerEnv,
} from '../../harness/setup'
import * as pipeline from '../../../src/payslip/pipeline'
import { payslipAnalysis } from '../../../src/db/schema'

vi.mock('../../../src/payslip/pipeline', () => ({
  runPayslipPipeline: vi.fn(),
}))

const mockRun = vi.mocked(pipeline.runPayslipPipeline)

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const minimalAnalysis = {
  insights: [],
  summary: {
    total_pension: '',
    total_keren_hishtalmut: '',
    total_expenses_reimbursed: '',
    net_pay: '',
    warnings: [] as string[],
    tips: [] as string[],
  },
  personal_header: {
    tax_credit_points: { raw_text: '', box_2d: [] as number[] },
    employee_gender: 'unknown' as const,
    pension_compliance: {
      pensionable_salary: { raw_text: '', box_2d: [] as number[] },
      employer_tagmulim: { raw_text: '', box_2d: [] as number[] },
      employee_pension_deduction: { raw_text: '', box_2d: [] as number[] },
    },
  },
}

function makePngForm(): FormData {
  const bytes = Uint8Array.from(Buffer.from(TINY_PNG_B64, 'base64'))
  const form = new FormData()
  form.append('file', new File([bytes], 'slip.png', { type: 'image/png' }))
  return form
}

describe('POST /api/payslip/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without session', async () => {
    const { app } = await createTestAppWithPayslip(null)
    const res = await app.request(
      'http://test/api/payslip/analyze',
      { method: 'POST', body: makePngForm() },
      testWorkerEnv(),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when file field is missing', async () => {
    const mockSession = createMockSession()
    const { app, db } = await createTestAppWithPayslip(mockSession)
    await createTestUser(db, mockSession)

    const res = await app.request(
      'http://test/api/payslip/analyze',
      { method: 'POST', body: new FormData() },
      testWorkerEnv(),
    )
    expect(res.status).toBe(400)
  })

  it('returns 500 when GEMINI_API_KEY is unset', async () => {
    const mockSession = createMockSession()
    const { app, db } = await createTestAppWithPayslip(mockSession)
    await createTestUser(db, mockSession)

    const res = await app.request(
      'http://test/api/payslip/analyze',
      { method: 'POST', body: makePngForm() },
      testWorkerEnv({ GEMINI_API_KEY: '' }),
    )
    expect(res.status).toBe(500)
  })

  it('returns fixture response without Gemini when PAYSLIP_USE_ANALYZE_FIXTURE is set', async () => {
    const mockSession = createMockSession()
    const { app, db } = await createTestAppWithPayslip(mockSession)
    await createTestUser(db, mockSession)

    const res = await app.request(
      'http://test/api/payslip/analyze',
      { method: 'POST', body: makePngForm() },
      testWorkerEnv({ GEMINI_API_KEY: '', PAYSLIP_USE_ANALYZE_FIXTURE: 'true' }),
    )

    expect(res.status).toBe(200)
    expect(mockRun).not.toHaveBeenCalled()
    const body = (await res.json()) as { meta: { width: number; height: number }; recordId: string }
    expect(body.meta.width).toBe(1)
    expect(body.meta.height).toBe(1)
    expect(body.recordId).toBeTruthy()
  })

  it('returns analysis JSON and persists row when pipeline succeeds', async () => {
    mockRun.mockResolvedValue({
      analysis: minimalAnalysis,
      featureLogs: ['[test] log'],
      annotationSpecs: [],
      meta: {
        originalFilename: 'slip.png',
        mimeType: 'image/png',
        rasterMimeType: 'image/png',
        width: 1,
        height: 1,
      },
    })

    const mockSession = createMockSession()
    const { app, db } = await createTestAppWithPayslip(mockSession)
    await createTestUser(db, mockSession)

    const res = await app.request(
      'http://test/api/payslip/analyze',
      { method: 'POST', body: makePngForm() },
      testWorkerEnv(),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      analysis: typeof minimalAnalysis
      featureLogs: string[]
      recordId: string
    }
    expect(body.analysis.personal_header.employee_gender).toBe('unknown')
    expect(body.featureLogs).toContain('[test] log')
    expect(body.recordId).toBeTruthy()

    const rows = await db.select().from(payslipAnalysis)
    expect(rows.length).toBe(1)
    expect(rows[0].status).toBe('success')
    expect(rows[0].userId).toBe(mockSession.user.id)
  })
})
