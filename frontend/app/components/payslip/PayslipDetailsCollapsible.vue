<script setup lang="ts">
import type { AnalysisResult, AnnotationSpec, PayslipAnalyzeMeta } from '~/types/payslip'

defineProps<{
  analysis: AnalysisResult
  featureLogs: string[]
  annotationSpecs: AnnotationSpec[]
  meta: PayslipAnalyzeMeta
  recordId: string
}>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <UCard :ui="{ body: 'p-0' }">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-highlighted hover:bg-elevated/50 rounded-lg"
      @click="open = !open"
    >
      {{ t('payslip.details.toggle') }}
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <div v-show="open" class="border-t border-default px-4 py-4 space-y-6">
      <div v-if="featureLogs.length">
        <h4 class="text-xs font-semibold uppercase text-muted mb-2">
          {{ t('payslip.details.featureLogs') }}
        </h4>
        <ul class="space-y-1.5 text-sm text-muted font-mono leading-relaxed">
          <li v-for="(log, i) in featureLogs" :key="i">
            {{ log }}
          </li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase text-muted mb-2">
          {{ t('payslip.details.insights') }}
        </h4>
        <div class="overflow-x-auto rounded-md border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated text-left text-xs text-muted uppercase">
              <tr>
                <th class="p-2 font-medium">
                  {{ t('payslip.details.colLabel') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('payslip.details.colValue') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('payslip.details.colCategory') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in analysis.insights"
                :key="i"
                class="border-t border-default"
              >
                <td class="p-2 text-highlighted max-w-[12rem] truncate" :title="row.label">
                  {{ row.label }}
                </td>
                <td class="p-2 tabular-nums">
                  {{ row.value }}
                </td>
                <td class="p-2 text-muted">
                  {{ row.category }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase text-muted mb-2">
          {{ t('payslip.details.personalHeader') }}
        </h4>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto text-muted">{{ JSON.stringify(analysis.personal_header, null, 2) }}</pre>
      </div>

      <div v-if="annotationSpecs.length">
        <h4 class="text-xs font-semibold uppercase text-muted mb-2">
          {{ t('payslip.details.annotations') }}
        </h4>
        <pre class="text-xs bg-elevated rounded-md p-3 overflow-x-auto text-muted">{{ JSON.stringify(annotationSpecs, null, 2) }}</pre>
      </div>

      <div>
        <h4 class="text-xs font-semibold uppercase text-muted mb-2">
          {{ t('payslip.details.meta') }}
        </h4>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt class="text-muted text-xs">
              recordId
            </dt>
            <dd class="font-mono text-xs break-all">
              {{ recordId }}
            </dd>
          </div>
          <div>
            <dt class="text-muted text-xs">
              {{ t('payslip.details.filename') }}
            </dt>
            <dd class="truncate" :title="meta.originalFilename">
              {{ meta.originalFilename }}
            </dd>
          </div>
          <div>
            <dt class="text-muted text-xs">
              {{ t('payslip.details.dimensions') }}
            </dt>
            <dd class="tabular-nums">
              {{ meta.width }} × {{ meta.height }}
            </dd>
          </div>
          <div>
            <dt class="text-muted text-xs">
              MIME
            </dt>
            <dd class="font-mono text-xs">
              {{ meta.mimeType }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </UCard>
</template>
