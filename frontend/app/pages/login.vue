<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  auth: false
})

usePageSeo('Login', 'Login to your account to continue')

const toast = useToast()
const { $authClient } = useNuxtApp()
const route = useRoute()
const { signIn, error } = useAuth()
const { emailPasswordEnabled } = useAuthConfig()

// When email+password auth is off, never show the credential form (Google only).
// When on, show password fields by default so login is obvious in dev.
const showPasswordForm = ref(emailPasswordEnabled.value)

// Get return URL from query params (for redirect after Google OAuth)
const returnUrl = computed(() => (route.query.returnUrl as string) || '/')

const showEmailPasswordUi = computed(
  () => emailPasswordEnabled.value && showPasswordForm.value
)

const formDescription = computed(() =>
  emailPasswordEnabled.value
    ? 'Enter your credentials to access your account.'
    : 'Sign in with your Google account to continue.'
)

const loginFields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox'
}]

// Only show fields when email+password auth is enabled and the form is expanded
const fields = computed(() => (showEmailPasswordUi.value ? loginFields : []))

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
        title: 'Google sign in failed',
        description: 'Please try again',
        color: 'error'
      })
    }
  }
}]

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await signIn(payload.data.email, payload.data.password)

    toast.add({
      title: 'Login successful',
      description: 'Welcome back!',
      color: 'primary'
    })

    // Redirect to dashboard
    await navigateTo('/')
  } catch {
    toast.add({
      title: 'Login failed',
      description: error.value || 'Please check your credentials and try again',
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
    :submit="showEmailPasswordUi ? { label: 'Sign-in' } : undefined"
    title="Welcome back!"
    :description="formDescription"
    icon="i-lucide-lock"
    @submit="onSubmit"
  >
    <template #description>
      Don't have an account? <ULink to="/register" class="text-primary font-medium">Sign up</ULink>.
    </template>
    <template v-if="emailPasswordEnabled" #password-hint>
      <ULink to="/forgot-password" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
    </template>
    <template #footer>
      <!-- Password login option - collapsed by default, hidden when email+password auth is disabled -->
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
          Sign in with Password
        </UButton>
        <p class="text-center text-sm text-muted">
          By signing in, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink>.
        </p>
      </div>
      <div v-else-if="showEmailPasswordUi">
        By signing in, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink>.
      </div>
      <div v-else>
        <!-- Email+password auth disabled - only social login available -->
        <p class="text-center text-sm text-muted">
          By signing in, you agree to our <ULink to="/terms" class="text-primary font-medium">Terms of Service</ULink>.
        </p>
      </div>
    </template>
  </UAuthForm>
</template>
