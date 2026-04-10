<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  auth: false
})

usePageSeo('Sign Up', 'Create a new account to get started')

const toast = useToast()
const { $authClient } = useNuxtApp()
const route = useRoute()
const { signUp, error } = useAuth()
const { emailPasswordEnabled } = useAuthConfig()

// When email+password auth is off, never show the registration form (Google only).
// When on, show fields by default (same as login).
const showPasswordForm = ref(emailPasswordEnabled.value)

// Get return URL from query params (for redirect after Google OAuth)
const returnUrl = computed(() => (route.query.returnUrl as string) || '/')

const showEmailPasswordUi = computed(
  () => emailPasswordEnabled.value && showPasswordForm.value
)

const formDescription = computed(() =>
  emailPasswordEnabled.value
    ? 'Get started with your free account today.'
    : 'Create your account with Google to continue.'
)

const registerFields: AuthFormField[] = [{
  name: 'firstName',
  type: 'text',
  label: 'First Name',
  placeholder: 'Enter your first name',
  required: true
}, {
  name: 'lastName',
  type: 'text',
  label: 'Last Name',
  placeholder: 'Enter your last name',
  required: true
}, {
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Create a password',
  required: true
}, {
  name: 'confirmPassword',
  label: 'Confirm Password',
  type: 'password',
  placeholder: 'Confirm your password',
  required: true
}, {
  name: 'terms',
  label: 'I agree to the Terms of Service and Privacy Policy',
  type: 'checkbox',
  required: true
}]

// Only show fields when email+password auth is enabled and the form is expanded
const fields = computed(() => (showEmailPasswordUi.value ? registerFields : []))

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: async () => {
    try {
      await $authClient.signIn.social({
        provider: 'google',
        callbackURL: returnUrl.value
      })
    } catch {
      toast.add({
        title: 'Google sign up failed',
        description: 'Please try again',
        color: 'error'
      })
    }
  }
}]

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords don\'t match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const fullName = `${payload.data.firstName} ${payload.data.lastName}`
    await signUp(payload.data.email, payload.data.password, fullName)

    toast.add({
      title: 'Account created successfully',
      description: 'Welcome! Please check your email to verify your account.',
      color: 'primary'
    })

    // Redirect to dashboard
    await navigateTo('/')
  } catch {
    toast.add({
      title: 'Registration failed',
      description: error.value || 'Please check your information and try again',
      color: 'error'
    })
  }
}
</script>

<template>
  <UAuthForm
    :schema="showEmailPasswordUi ? schema : undefined"
    :fields="fields"
    :providers="providers"
    :submit="showEmailPasswordUi ? { label: 'Sign-up' } : undefined"
    title="Create your account"
    :description="formDescription"
    icon="i-lucide-user-plus"
    @submit="onSubmit"
  >
    <template #description>
      Already have an account? <ULink to="/login" class="text-primary font-medium">Sign in</ULink>.
    </template>
    <template #footer>
      <!-- Password signup option - collapsed by default, hidden when email+password auth is disabled -->
      <div v-if="emailPasswordEnabled && !showPasswordForm" class="space-y-4">
        <USeparator label="or" />
        <UButton
          color="neutral"
          variant="outline"
          block
          icon="i-lucide-key"
          class="justify-center"
          @click="showPasswordForm = true"
        >
          Sign up with Password
        </UButton>
        <p class="text-center text-sm text-muted">
          By creating an account, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink> and <ULink to="/privacy" class="text-primary font-medium">Privacy Policy</ULink>.
        </p>
      </div>
      <div v-else-if="showEmailPasswordUi">
        By creating an account, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink> and <ULink to="/privacy" class="text-primary font-medium">Privacy Policy</ULink>.
      </div>
      <div v-else>
        <!-- Email+password auth disabled - only social signup available -->
        <p class="text-center text-sm text-muted">
          By creating an account, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink> and <ULink to="/privacy" class="text-primary font-medium">Privacy Policy</ULink>.
        </p>
      </div>
    </template>
  </UAuthForm>
</template>
