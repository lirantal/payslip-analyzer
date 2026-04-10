<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const appConfig = useAppConfig()

const { locale } = useI18n()
const lang = computed(() => locales[locale.value].code)
const dir = computed(() => locales[locale.value].dir)

const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: appConfig.branding.favicon }
  ],
  htmlAttrs: {
    lang,
    dir
  }
})

useSeoMeta({
  title: appConfig.identity.name,
  description: appConfig.identity.description,
  ogTitle: appConfig.identity.name,
  ogDescription: appConfig.identity.description,
  ogImage: appConfig.seo.ogImage,
  twitterImage: appConfig.seo.ogImage,
  twitterCard: appConfig.seo.twitterCard
})
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
