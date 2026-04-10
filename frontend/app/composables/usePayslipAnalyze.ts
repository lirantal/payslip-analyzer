import type { PayslipAnalyzeResponse } from '~/types/payslip'

export function usePayslipAnalyze() {
  const toast = useToast()
  const apiOrigin = useApiOrigin()

  const analyzing = ref(false)
  const error = ref<string | null>(null)

  async function analyze(file: File): Promise<PayslipAnalyzeResponse | null> {
    analyzing.value = true
    error.value = null
    try {
      const body = new FormData()
      body.append('file', file)
      const data = await $fetch<PayslipAnalyzeResponse>(`${apiOrigin.value}/api/payslip/analyze`, {
        method: 'POST',
        body,
        credentials: 'include'
      })
      return data
    } catch (err: unknown) {
      const e = err as { statusCode?: number, status?: number, data?: { error?: string }, message?: string }
      const status = e.statusCode ?? e.status
      const msg = e.data?.error ?? e.message ?? 'Analysis failed'
      error.value = typeof msg === 'string' ? msg : 'Analysis failed'

      if (status === 401) {
        toast.add({
          title: 'Sign in required',
          description: 'Your session may have expired. Sign in again and retry.',
          icon: 'i-lucide-lock',
          color: 'warning'
        })
      }
      return null
    } finally {
      analyzing.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    analyze,
    analyzing: readonly(analyzing),
    error: readonly(error),
    clearError
  }
}
