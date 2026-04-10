<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const appConfig = useAppConfig()

// Check if teams are configured
const hasTeams = computed(() => appConfig.teams && appConfig.teams.length > 0)

// Selected team state (defaults to first team if available)
const selectedTeam = ref(hasTeams.value ? appConfig.teams[0] : null)

// Build dropdown menu items from configured teams
const items = computed<DropdownMenuItem[][]>(() => {
  if (!hasTeams.value) return []

  return [
    appConfig.teams.map(team => ({
      label: team.label,
      avatar: {
        src: team.logo,
        alt: team.label
      },
      onSelect() {
        selectedTeam.value = team
      }
    })),
    [{
      label: 'Create team',
      icon: 'i-lucide-circle-plus'
    }, {
      label: 'Manage teams',
      icon: 'i-lucide-cog'
    }]
  ]
})
</script>

<template>
  <!-- Team switcher dropdown (when teams are configured) -->
  <UDropdownMenu
    v-if="hasTeams && selectedTeam"
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :avatar="{ src: selectedTeam.logo, alt: selectedTeam.label }"
      :label="collapsed ? undefined : selectedTeam.label"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>

  <!-- Simple app branding (when no teams configured) -->
  <NuxtLink
    v-else
    to="/"
    class="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-elevated transition-colors"
    :class="[collapsed && 'justify-center']"
  >
    <UAvatar
      :src="appConfig.branding.logo"
      :alt="appConfig.branding.logoAlt"
      size="sm"
      :ui="{ fallback: 'bg-primary text-white' }"
    >
      <template #fallback>
        <span class="text-xs font-bold">{{ appConfig.identity.name.charAt(0) }}</span>
      </template>
    </UAvatar>
    <span
      v-if="!collapsed"
      class="font-semibold text-sm truncate"
    >
      {{ appConfig.identity.name }}
    </span>
  </NuxtLink>
</template>
