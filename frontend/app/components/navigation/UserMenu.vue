<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const appConfig = useAppConfig()
const { user, signOut } = useAuth()
const resolveAvatarUrl = useResolveAvatarUrl()

/** R2 keys / relative paths are not valid img src; resolve via CDN or presigned URL. */
const resolvedAvatarSrc = ref<string | undefined>(undefined)

watch(
  () => user.value?.image ?? null,
  async (img) => {
    resolvedAvatarSrc.value = await resolveAvatarUrl(img)
  },
  { immediate: true }
)

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

// Create computed user object with fallback
const currentUser = computed(() => {
  if (user.value) {
    const name = user.value.name || 'User'
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    return {
      name,
      avatar: {
        src: resolvedAvatarSrc.value || fallback,
        alt: name
      }
    }
  }

  // Fallback for when user is not loaded yet
  return {
    name: 'Loading...',
    avatar: {
      src: 'https://ui-avatars.com/api/?name=User&background=random',
      alt: 'User'
    }
  }
})

// Build external links section dynamically based on what's configured
const externalLinksSection = computed<DropdownMenuItem[]>(() => {
  const links: DropdownMenuItem[] = []

  if (appConfig.links.documentation) {
    links.push({
      label: 'Documentation',
      icon: 'i-lucide-book-open',
      to: appConfig.links.documentation,
      target: '_blank'
    })
  }

  if (appConfig.links.support) {
    links.push({
      label: 'Support',
      icon: 'i-lucide-help-circle',
      to: appConfig.links.support,
      target: appConfig.links.support.startsWith('mailto:') ? undefined : '_blank'
    })
  }

  if (appConfig.links.feedback) {
    links.push({
      label: 'Feedback',
      icon: 'i-lucide-message-circle',
      to: appConfig.links.feedback,
      target: '_blank'
    })
  }

  if (appConfig.links.repository) {
    links.push({
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      to: appConfig.links.repository,
      target: '_blank'
    })
  }

  return links
})

const items = computed<DropdownMenuItem[][]>(() => {
  const menuItems: DropdownMenuItem[][] = [[{
    type: 'label',
    label: currentUser.value.name,
    avatar: currentUser.value.avatar
  }], [{
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings'
  }]]

  // Add dev/testing features section if any are enabled
  const devFeatures: DropdownMenuItem[] = []

  if (appConfig.features.showThemePicker) {
    devFeatures.push({
      label: 'Theme',
      icon: 'i-lucide-palette',
      children: [{
        label: 'Primary',
        slot: 'chip',
        chip: appConfig.ui.colors.primary,
        content: {
          align: 'center',
          collisionPadding: 16
        },
        children: colors.map(color => ({
          label: color,
          chip: color,
          slot: 'chip',
          checked: appConfig.ui.colors.primary === color,
          type: 'checkbox',
          onSelect: (e) => {
            e.preventDefault()
            appConfig.ui.colors.primary = color
          }
        }))
      }, {
        label: 'Neutral',
        slot: 'chip',
        chip: appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral,
        content: {
          align: 'end',
          collisionPadding: 16
        },
        children: neutrals.map(color => ({
          label: color,
          chip: color === 'neutral' ? 'old-neutral' : color,
          slot: 'chip',
          type: 'checkbox',
          checked: appConfig.ui.colors.neutral === color,
          onSelect: (e) => {
            e.preventDefault()
            appConfig.ui.colors.neutral = color
          }
        }))
      }]
    })
  }

  if (appConfig.features.showAppearanceToggle) {
    devFeatures.push({
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [{
        label: 'Light',
        icon: 'i-lucide-sun',
        type: 'checkbox',
        checked: colorMode.value === 'light',
        onSelect(e: Event) {
          e.preventDefault()
          colorMode.preference = 'light'
        }
      }, {
        label: 'Dark',
        icon: 'i-lucide-moon',
        type: 'checkbox',
        checked: colorMode.value === 'dark',
        onUpdateChecked(checked: boolean) {
          if (checked) {
            colorMode.preference = 'dark'
          }
        },
        onSelect(e: Event) {
          e.preventDefault()
        }
      }]
    })
  }

  if (devFeatures.length > 0) {
    menuItems.push(devFeatures)
  }

  // Add external links section if any links are configured
  if (externalLinksSection.value.length > 0) {
    menuItems.push(externalLinksSection.value)
  }

  // Add logout section
  menuItems.push([{
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onClick: async () => {
      try {
        await signOut()
        await navigateTo('/login')
      } catch (error) {
        console.error('Sign out error:', error)
      }
    }
  }])

  return menuItems
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...currentUser,
        label: collapsed ? undefined : currentUser?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />

    <template #chip-leading="{ item }">
      <span
        :style="{
          '--chip-light': `var(--color-${(item as any).chip}-500)`,
          '--chip-dark': `var(--color-${(item as any).chip}-400)`
        }"
        class="ms-0.5 size-2 rounded-full bg-(--chip-light) dark:bg-(--chip-dark)"
      />
    </template>
  </UDropdownMenu>
</template>
