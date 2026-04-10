<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

usePageSeo('Page not found', 'We are sorry but this page could not be found.')

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
