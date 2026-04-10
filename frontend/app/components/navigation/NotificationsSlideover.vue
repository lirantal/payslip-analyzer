<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
const { t } = useI18n()
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    :title="t('payslip.notifications.slideoverTitle')"
  >
    <template #body>
      <p class="text-sm text-muted px-1">
        {{ t('payslip.notifications.empty') }}
      </p>
    </template>
  </USlideover>
</template>
