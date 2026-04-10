<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const model = defineModel<File | null>({ default: null })
const rasterizing = defineModel<boolean>('rasterizing', { default: false })

const { t } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const previewUrl = ref<string | null>(null)
const pdfError = ref<string | null>(null)

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function isRasterImage(file: File): boolean {
  const t = file.type
  return t === 'image/png' || t === 'image/jpeg' || t === 'image/webp'
}

async function applyFile(file: File | null) {
  pdfError.value = null
  if (!file) {
    model.value = null
    return
  }
  if (isRasterImage(file)) {
    model.value = file
    return
  }
  if (isPdf(file)) {
    rasterizing.value = true
    try {
      const { pdfFileToRasterPng } = await import('~/utils/pdf-rasterize')
      model.value = await pdfFileToRasterPng(file)
    } catch {
      pdfError.value = t('payslip.upload.pdfError')
      model.value = null
    } finally {
      rasterizing.value = false
    }
    return
  }
  pdfError.value = t('payslip.upload.unsupportedType')
  model.value = null
}

watch(
  () => model.value,
  (file) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

function pickFile() {
  if (props.disabled || rasterizing.value) return
  fileInput.value?.click()
}

function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (file) {
    void applyFile(file)
  }
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (props.disabled || rasterizing.value) return
  const file = e.dataTransfer?.files?.[0]
  if (file && (isRasterImage(file) || isPdf(file))) {
    void applyFile(file)
  }
}

function clearFile() {
  pdfError.value = null
  model.value = null
}
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-6' }">
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/png,image/jpeg,image/webp,application/pdf"
      :disabled="disabled || rasterizing"
      @change="onInputChange"
    >

    <UAlert
      v-if="pdfError"
      color="error"
      variant="subtle"
      class="mb-4"
      :title="t('payslip.upload.pdfErrorTitle')"
      :description="pdfError"
    />

    <div
      class="rounded-lg border-2 border-dashed transition-colors"
      :class="[
        dragOver ? 'border-primary bg-primary/5' : 'border-default',
        (disabled || rasterizing) && 'opacity-60 pointer-events-none'
      ]"
      @dragenter.prevent="dragOver = true"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop="onDrop"
    >
      <div
        v-if="rasterizing"
        class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center"
      >
        <UIcon name="i-lucide-loader-circle" class="size-10 text-primary animate-spin" />
        <p class="text-sm text-muted">
          {{ t('payslip.upload.pdfConverting') }}
        </p>
      </div>

      <div
        v-else-if="!model"
        class="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center"
      >
        <UIcon name="i-lucide-image-plus" class="size-10 text-muted" />
        <div class="space-y-1">
          <p class="text-sm text-highlighted font-medium">
            {{ $t('payslip.upload.dropTitle') }}
          </p>
          <p class="text-xs text-muted max-w-md">
            {{ $t('payslip.upload.hint') }}
          </p>
        </div>
        <UButton
          icon="i-lucide-folder-open"
          :disabled="disabled"
          @click="pickFile"
        >
          {{ $t('payslip.upload.choose') }}
        </UButton>
      </div>

      <div v-else class="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 items-start">
        <div class="shrink-0 rounded-md overflow-hidden border border-default bg-elevated max-h-48">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="model.name"
            class="max-h-48 w-auto object-contain"
          >
        </div>
        <div class="flex-1 min-w-0 space-y-3">
          <p class="text-sm font-medium text-highlighted truncate" :title="model.name">
            {{ model.name }}
          </p>
          <p class="text-xs text-muted tabular-nums">
            {{ (model.size / 1024).toFixed(1) }} KB
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              variant="outline"
              size="sm"
              :disabled="disabled"
              @click="pickFile"
            >
              {{ $t('payslip.upload.replace') }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="disabled"
              @click="clearFile"
            >
              {{ $t('payslip.upload.clear') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
