<script setup lang="ts">
import type { PayslipAnalyzeResponse } from '~/types/payslip'

const { t } = useI18n()
const appConfig = useAppConfig()

usePageSeo(t('payslip.title'), appConfig.identity.description)

const { isNotificationsSlideoverOpen } = useDashboard()
const { analyze, analyzing, error: analyzeError, clearError } = usePayslipAnalyze()

const selectedFile = ref<File | null>(null)
const uploadRasterizing = ref(false)
const result = ref<PayslipAnalyzeResponse | null>(null)
const overlayUrl = ref<string | null>(null)
/** Wall-clock analyze round-trip in seconds; set only on successful API response. */
const analyzeDurationSeconds = ref<number | null>(null)

watch(selectedFile, () => {
  result.value = null
  analyzeDurationSeconds.value = null
  clearError()
})

watch(
  [selectedFile, result],
  ([file, res]) => {
    if (overlayUrl.value) {
      URL.revokeObjectURL(overlayUrl.value)
      overlayUrl.value = null
    }
    if (file && res) {
      overlayUrl.value = URL.createObjectURL(file)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (overlayUrl.value) {
    URL.revokeObjectURL(overlayUrl.value)
  }
})

async function onAnalyze() {
  if (!selectedFile.value || analyzing.value) return
  result.value = null
  analyzeDurationSeconds.value = null
  clearError()
  const t0 = performance.now()
  const data = await analyze(selectedFile.value)
  const elapsedSec = (performance.now() - t0) / 1000
  if (data) {
    result.value = data
    analyzeDurationSeconds.value = elapsedSec
  }
}

function resetAll() {
  selectedFile.value = null
  result.value = null
  analyzeDurationSeconds.value = null
  clearError()
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :title="t('payslip.title')" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip :text="t('payslip.notifications.tooltip')" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="pb-8">
        <!-- Phase 1: upload (hidden once we have a successful result) -->
        <div
          v-if="!result"
          class="flex flex-col items-center text-center gap-6 lg:gap-8"
        >
          <p class="text-sm text-muted w-full max-w-2xl mx-auto">
            {{ t('payslip.intro') }}
          </p>

          <div class="w-full max-w-xl mx-auto">
            <PayslipUploadPanel
              v-model="selectedFile"
              v-model:rasterizing="uploadRasterizing"
              :disabled="analyzing"
            />
          </div>

          <div class="flex justify-center w-full">
            <UButton
              icon="i-lucide-scan-line"
              :disabled="!selectedFile || analyzing || uploadRasterizing"
              :loading="analyzing"
              size="lg"
              @click="onAnalyze"
            >
              {{ t('payslip.analyze') }}
            </UButton>
          </div>

          <div v-if="analyzing" class="flex flex-col items-center justify-center gap-4 py-8 w-full">
            <UIcon name="i-lucide-loader-circle" class="size-12 text-primary animate-spin" />
            <p class="text-sm text-muted">
              {{ t('payslip.analyzing') }}
            </p>
          </div>

          <UAlert
            v-else-if="analyzeError"
            color="error"
            variant="subtle"
            class="w-full max-w-xl mx-auto text-start"
            :title="t('payslip.errorTitle')"
            :description="analyzeError"
          />
        </div>

        <!-- Phase 2: results only -->
        <div v-else class="space-y-6 lg:space-y-8">
          <p
            v-if="analyzeDurationSeconds != null"
            class="text-sm text-muted text-center"
          >
            {{
              t('payslip.analyzedIn', {
                seconds: analyzeDurationSeconds.toFixed(2)
              })
            }}
          </p>

          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t('payslip.summary.heading') }}
            </h2>
            <PayslipSummaryCards :summary="result.analysis.summary" />
          </div>

          <div v-if="overlayUrl" class="space-y-2">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t('payslip.overlay.heading') }}
            </h2>
            <PayslipAnnotationOverlay
              :image-url="overlayUrl"
              :width="result.meta.width"
              :height="result.meta.height"
              :annotation-specs="result.annotationSpecs"
            />
          </div>

          <PayslipWarningsTips
            :warnings="result.analysis.summary.warnings"
            :tips="result.analysis.summary.tips"
          />

          <PayslipDetailsCollapsible
            :analysis="result.analysis"
            :feature-logs="result.featureLogs"
            :annotation-specs="result.annotationSpecs"
            :meta="result.meta"
            :record-id="result.recordId"
          />

          <div class="flex justify-center w-full pt-2">
            <UButton
              icon="i-lucide-scan-line"
              size="lg"
              :disabled="analyzing"
              @click="resetAll"
            >
              {{ t('payslip.analyze') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
