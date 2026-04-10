<script setup lang="ts">
import type { PayslipSummary } from '~/types/payslip'

const props = defineProps<{
  summary: PayslipSummary
}>()

const { t } = useI18n()

const cards = computed(() => [
  {
    title: t('payslip.summary.netPay'),
    icon: 'i-lucide-banknote',
    value: props.summary.net_pay
  },
  {
    title: t('payslip.summary.pension'),
    icon: 'i-lucide-piggy-bank',
    value: props.summary.total_pension
  },
  {
    title: t('payslip.summary.keren'),
    icon: 'i-lucide-graduation-cap',
    value: props.summary.total_keren_hishtalmut
  },
  {
    title: t('payslip.summary.expenses'),
    icon: 'i-lucide-receipt',
    value: props.summary.total_expenses_reimbursed
  }
])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="stat in cards"
      :key="stat.title"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <p class="text-lg sm:text-2xl font-semibold text-highlighted leading-snug">
        {{ stat.value }}
      </p>
    </UPageCard>
  </UPageGrid>
</template>
