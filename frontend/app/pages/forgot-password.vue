<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  auth: false
})

usePageSeo('Forgot Password', 'Reset your password to regain access to your account')

const { emailPasswordEnabled } = useAuthConfig()

// Redirect to login if email+password auth is disabled (no password to reset)
onMounted(() => {
  if (!emailPasswordEnabled.value) {
    navigateTo('/login')
  }
})

const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email address',
  required: true
}]

const schema = z.object({
  email: z.string().email('Invalid email')
})

type Schema = z.output<typeof schema>

function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Password reset requested:', payload)
  // TODO: Implement actual password reset logic with Better Auth email features
  toast.add({
    title: 'Reset link sent',
    description: 'Check your email for instructions to reset your password.',
    color: 'primary'
  })
}
</script>

<template>
  <UAuthForm
    :schema="schema"
    :fields="fields"
    title="Forgot your password?"
    description="No worries, we'll send you reset instructions."
    icon="i-lucide-key"
    @submit="onSubmit"
  >
    <template #description>
      Remember your password? <ULink to="/login" class="text-primary font-medium">Sign in</ULink>.
    </template>
    <template #footer>
      Didn't receive the email? Check your spam folder or <ULink to="/contact" class="text-primary font-medium">contact support</ULink>.
    </template>
  </UAuthForm>
</template>
