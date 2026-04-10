<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const appConfig = useAppConfig()

const open = ref(false)
/** Desktop sidebar: start collapsed (icon rail); persisted in cookie when resizable/collapsible. */
const sidebarCollapsed = ref(true)

// Build external links dynamically based on what's configured
const externalLinks = computed<NavigationMenuItem[]>(() => {
  const links: NavigationMenuItem[] = []

  if (appConfig.links.feedback) {
    links.push({
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: appConfig.links.feedback,
      target: '_blank'
    })
  }

  if (appConfig.links.support) {
    links.push({
      label: 'Help & Support',
      icon: 'i-lucide-info',
      to: appConfig.links.support,
      target: appConfig.links.support.startsWith('mailto:') ? undefined : '_blank'
    })
  }

  return links
})

const mainLinks: NavigationMenuItem[] = [{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Settings',
  to: '/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Security',
    to: '/settings/security',
    onSelect: () => {
      open.value = false
    }
  }]
}]

const groups = computed(() => {
  const searchGroups = [{
    id: 'links',
    label: 'Go to',
    items: [...mainLinks, ...externalLinks.value]
  }]

  // Only add Code section if repository is configured
  if (appConfig.links.repository) {
    searchGroups.push({
      id: 'code',
      label: 'Code',
      items: [{
        id: 'source',
        label: 'View page source',
        icon: 'i-simple-icons-github',
        to: `${appConfig.links.repository}/blob/main/cloudflare-app/frontend/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
        target: '_blank'
      }]
    })
  }

  return searchGroups
})

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NavigationTeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          v-if="externalLinks.length > 0"
          :collapsed="collapsed"
          :items="externalLinks"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <NavigationUserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NavigationNotificationsSlideover />
  </UDashboardGroup>
</template>
