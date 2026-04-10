<script setup lang="ts">
import type { DeleteAccountErrorResponse } from '~/composables/useAuth'

const emit = defineEmits<{
  deleted: []
  cancelled: []
}>()

const { deleteAccount, isLoading } = useAuth()
const { emailPasswordEnabled } = useAuthConfig()
const toast = useToast()

const open = ref(false)
const password = ref('')
const confirmationText = ref('')
const errorMessage = ref<string | null>(null)
// Default to password mode only if email+password auth is enabled
const requiresPassword = ref(emailPasswordEnabled.value)

async function onConfirm() {
  errorMessage.value = null

  try {
    if (requiresPassword.value) {
      // Password-based account
      if (!password.value) {
        errorMessage.value = 'Please enter your password'
        return
      }
      await deleteAccount({ password: password.value })
    } else {
      // OAuth-only account
      if (confirmationText.value !== 'DELETE') {
        errorMessage.value = 'Please type "DELETE" to confirm'
        return
      }
      await deleteAccount({ confirmationText: confirmationText.value })
    }

    toast.add({
      title: 'Account deleted',
      description: 'Your account has been scheduled for deletion.',
      color: 'success'
    })

    emit('deleted')
    open.value = false
  } catch (err) {
    // Handle specific error responses
    const errorData = err as DeleteAccountErrorResponse
    if (errorData?.requiresConfirmationText) {
      // User has OAuth account, switch to confirmation text mode
      requiresPassword.value = false
      errorMessage.value = 'Please type "DELETE" to confirm account deletion'
    } else if (errorData?.requiresPassword) {
      requiresPassword.value = true
      errorMessage.value = 'Please enter your password to confirm'
    } else if (errorData?.error) {
      errorMessage.value = errorData.error
    } else {
      errorMessage.value = 'Failed to delete account. Please try again.'
    }
  }
}

function onCancel() {
  open.value = false
  password.value = ''
  confirmationText.value = ''
  errorMessage.value = null
  emit('cancelled')
}

// Reset state when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    password.value = ''
    confirmationText.value = ''
    errorMessage.value = null
    // Default to password mode only if email+password auth is enabled
    requiresPassword.value = emailPasswordEnabled.value
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Delete Account"
    description="This action cannot be undone. Your account will be scheduled for permanent deletion."
  >
    <slot />

    <template #body>
      <div class="space-y-4">
        <!-- Warning message -->
        <UAlert
          title="Warning"
          description="All your events, files, and data will be permanently deleted after 30 days. This cannot be undone."
          color="error"
          icon="i-lucide-alert-triangle"
        />

        <!-- Error message -->
        <UAlert
          v-if="errorMessage"
          :title="errorMessage"
          color="error"
          icon="i-lucide-x-circle"
        />

        <!-- Password input (for credential accounts) -->
        <div v-if="requiresPassword" class="space-y-2">
          <label class="text-sm font-medium">Confirm your password</label>
          <UInput
            v-model="password"
            type="password"
            placeholder="Enter your password"
            class="w-full"
            :disabled="isLoading"
          />
        </div>

        <!-- Confirmation text input (for OAuth accounts) -->
        <div v-else class="space-y-2">
          <label class="text-sm font-medium">Type "DELETE" to confirm</label>
          <UInput
            v-model="confirmationText"
            type="text"
            placeholder="DELETE"
            class="w-full"
            :disabled="isLoading"
          />
        </div>

        <!-- Action buttons -->
        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="isLoading"
            @click="onCancel"
          />
          <UButton
            label="Delete Account"
            color="error"
            variant="solid"
            :loading="isLoading"
            @click="onConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
