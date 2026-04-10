<script setup lang="ts">
defineProps<{
  warnings: string[]
  tips: string[]
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="warnings.length || tips.length" class="grid gap-4 sm:grid-cols-2">
    <UCard v-if="warnings.length" :ui="{ body: 'p-4 space-y-2' }">
      <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
        <UIcon name="i-lucide-alert-triangle" class="size-4 text-warning" />
        {{ t('payslip.warnings.title') }}
      </h3>
      <ul class="list-disc ps-4 text-sm text-muted space-y-1">
        <li v-for="(w, i) in warnings" :key="`w-${i}`">
          {{ w }}
        </li>
      </ul>
    </UCard>

    <UCard v-if="tips.length" :ui="{ body: 'p-4 space-y-2' }">
      <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
        <UIcon name="i-lucide-lightbulb" class="size-4 text-primary" />
        {{ t('payslip.tips.title') }}
      </h3>
      <ul class="list-disc ps-4 text-sm text-muted space-y-1">
        <li v-for="(tip, i) in tips" :key="`t-${i}`">
          {{ tip }}
        </li>
      </ul>
    </UCard>
  </div>
</template>
