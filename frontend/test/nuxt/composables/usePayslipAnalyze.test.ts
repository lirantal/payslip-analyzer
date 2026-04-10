import { computed } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

vi.stubGlobal('useApiOrigin', () => computed(() => 'http://localhost:8787'))

const { usePayslipAnalyze } = await import('~/composables/usePayslipAnalyze')

describe('usePayslipAnalyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('posts multipart file to analyze endpoint', async () => {
    const payload = {
      analysis: {
        insights: [],
        summary: {
          total_pension: '',
          total_keren_hishtalmut: '',
          total_expenses_reimbursed: '',
          net_pay: '100',
          warnings: [],
          tips: []
        },
        personal_header: {
          tax_credit_points: { raw_text: '', box_2d: [] },
          employee_gender: 'unknown' as const,
          pension_compliance: {
            pensionable_salary: { raw_text: '', box_2d: [] },
            employer_tagmulim: { raw_text: '', box_2d: [] },
            employee_pension_deduction: { raw_text: '', box_2d: [] }
          }
        }
      },
      featureLogs: [],
      annotationSpecs: [],
      meta: {
        originalFilename: 'x.png',
        mimeType: 'image/png',
        rasterMimeType: 'image/png',
        width: 1,
        height: 1
      },
      recordId: 'rid-1'
    }
    mockFetch.mockResolvedValue(payload)

    const { analyze } = usePayslipAnalyze()
    const file = new File(['x'], 'slip.png', { type: 'image/png' })
    const result = await analyze(file)

    expect(result).toEqual(payload)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/payslip/analyze',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.any(FormData)
      })
    )
  })

  it('returns null and sets error on failure', async () => {
    mockFetch.mockRejectedValue({
      statusCode: 500,
      data: { error: 'Gemini unavailable' }
    })

    const { analyze, error } = usePayslipAnalyze()
    const file = new File(['x'], 'slip.png', { type: 'image/png' })
    const result = await analyze(file)

    expect(result).toBeNull()
    expect(error.value).toBe('Gemini unavailable')
  })

  it('surfaces 401 auth errors in error state', async () => {
    const err = Object.assign(new Error('401 Unauthorized'), {
      statusCode: 401,
      data: { error: 'Authentication required' }
    })
    mockFetch.mockRejectedValue(err)

    const { analyze, error } = usePayslipAnalyze()
    await analyze(new File(['x'], 'slip.png', { type: 'image/png' }))

    expect(error.value).toBe('Authentication required')
  })
})
