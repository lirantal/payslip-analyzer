<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { onMounted } from 'vue'

usePageSeo('Profile', 'Update your name, avatar, and bio.')

const config = useRuntimeConfig()
const fileRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const { uploadFile, uploading, uploadProgress, error: uploadError, clearError } = useAvatarUpload()
const { profile, loadProfile, saveProfile } = useProfile()

const profileSchema = z.object({
  name: z.string().min(2, 'Too short'),
  avatar: z.string().optional(),
  bio: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

// Load profile data on mount
onMounted(() => {
  loadProfile()
})

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    // If a new avatar file was selected, upload it first
    if (selectedFile.value) {
      await uploadFile(selectedFile.value)

      // Update local profile with preview URL
      if (config.public.r2CdnUrl) {
        // Keep the local preview until we get the actual URL from backend after save
        profile.avatar = URL.createObjectURL(selectedFile.value)
      }

      // Clear selected file after successful upload
      selectedFile.value = null
    }

    // Submit profile data (name and bio - avatar is handled separately by backend)
    await saveProfile({
      name: event.data.name,
      bio: event.data.bio
    })
  } catch (err: unknown) {
    // Error handling is done in saveProfile composable
    // But we can add additional handling here if needed
    console.error('Failed to save profile:', err)
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  // Store the selected file for later upload
  selectedFile.value = input.files[0]!

  // Create local preview
  profile.avatar = URL.createObjectURL(input.files[0]!)

  // Clear any previous upload errors
  clearError()
}

function onFileClick() {
  fileRef.value?.click()
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profile"
      description="These informations will be displayed publicly."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Save changes"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="Name"
        description="Will appear on receipts, invoices, and other communication."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          v-model="profile.name"
          autocomplete="off"
        />
      </UFormField>
      <USeparator />
      <USeparator />
      <UFormField
        name="avatar"
        label="Avatar"
        description="JPG, GIF or PNG. 1MB Max."
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-col gap-3 w-full">
          <div class="flex flex-wrap items-center gap-3">
            <UAvatar
              :src="profile.avatar"
              :alt="profile.name"
              size="lg"
            />
            <UButton
              label="Choose"
              color="neutral"
              :disabled="uploading"
              @click="onFileClick"
            />
            <input
              ref="fileRef"
              type="file"
              class="hidden"
              accept=".jpg, .jpeg, .png, .gif"
              @change="onFileChange"
            >
            <span v-if="uploading" class="text-sm text-muted">
              Uploading... {{ uploadProgress }}%
            </span>
          </div>
          <div v-if="uploadError" class="text-sm text-red-500">
            {{ uploadError.message }}
          </div>
        </div>
      </UFormField>

      <!-- TODO: add bio field back in once we find a proper use for it -->
      <!-- <USeparator />
      <UFormField
        name="bio"
        label="Bio"
        description="Brief description for your profile. URLs are hyperlinked."
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea
          v-model="profile.bio"
          :rows="5"
          autoresize
          class="w-full"
        />
      </UFormField> -->
    </UPageCard>
  </UForm>
</template>
