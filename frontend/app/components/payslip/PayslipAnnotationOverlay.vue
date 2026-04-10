<script setup lang="ts">
import type { AnnotationSpec } from '~/types/payslip'
import { box2dToPixelRect, validBox, type Box2d } from '~/utils/box2d'

const props = defineProps<{
  imageUrl: string
  width: number
  height: number
  annotationSpecs: AnnotationSpec[]
}>()

/** Scale typography with raster height so labels stay readable on large payslips. */
function fontSizeForHeight(h: number): number {
  return Math.round(Math.max(26, Math.min(48, h / 72)))
}

interface BadgeLayout {
  spec: AnnotationSpec
  rect: ReturnType<typeof box2dToPixelRect>
  badgeX: number
  badgeY: number
  badgeW: number
  badgeH: number
  rx: number
  fontSize: number
  textX: number
  textY: number
  fill: string
}

const items = computed((): BadgeLayout[] => {
  const { width, height } = props
  const fontSize = fontSizeForHeight(height)
  const padX = Math.round(fontSize * 0.45)
  const padY = Math.round(fontSize * 0.32)
  const gap = Math.round(fontSize * 0.28)
  const rx = Math.round(fontSize * 0.22)

  return props.annotationSpecs
    .filter(s => validBox(s.box_2d))
    .map((s) => {
      const rect = box2dToPixelRect(width, height, s.box_2d as Box2d)
      const below = s.preferLabelBelow === true
      const fill = s.strokeColor?.trim() || '#DC2626'

      const chW = fontSize * 0.52
      const estW = Math.min(
        width - 8,
        Math.max(fontSize * 5, s.label.length * chW + padX * 2)
      )
      const badgeW = Math.round(estW)
      const badgeH = Math.round(fontSize * 1.35 + padY * 2)

      const centerX = rect.x + rect.width / 2
      let badgeX = Math.round(centerX - badgeW / 2)
      badgeX = Math.max(4, Math.min(badgeX, width - badgeW - 4))

      /** Leave ~one payslip text row clear between box and badge (avoids covering נ״ז digits when the box sits high). */
      const belowRowClearance = below
        ? Math.min(
            Math.round(height * 0.055),
            Math.round(Math.max(fontSize * 1.2, height * 0.018, rect.height * 1.6))
          )
        : 0

      const badgeY = below
        ? rect.y + rect.height + gap + belowRowClearance
        : Math.max(4, rect.y - gap - badgeH)

      const textX = badgeX + badgeW / 2
      const textY = badgeY + badgeH / 2

      return {
        spec: s,
        rect,
        badgeX,
        badgeY,
        badgeW,
        badgeH,
        rx,
        fontSize,
        textX,
        textY,
        fill
      }
    })
})
</script>

<template>
  <div class="rounded-lg border border-default overflow-hidden bg-elevated">
    <svg
      class="block w-full h-auto max-h-[min(70vh,1200px)]"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="$t('payslip.overlay.aria')"
    >
      <image
        :href="imageUrl"
        x="0"
        y="0"
        :width="width"
        :height="height"
      />

      <g v-for="(item, i) in items" :key="item.spec.id || i">
        <rect
          :x="item.rect.x"
          :y="item.rect.y"
          :width="item.rect.width"
          :height="item.rect.height"
          fill="none"
          :stroke="item.fill"
          stroke-width="2.5"
        />
        <rect
          :x="item.badgeX"
          :y="item.badgeY"
          :width="item.badgeW"
          :height="item.badgeH"
          :rx="item.rx"
          :ry="item.rx"
          :fill="item.fill"
        />
        <text
          :x="item.textX"
          :y="item.textY"
          fill="#ffffff"
          text-anchor="middle"
          dominant-baseline="middle"
          font-weight="700"
          :font-size="item.fontSize"
          style="direction: rtl; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;"
        >
          {{ item.spec.label }}
        </text>
      </g>
    </svg>
  </div>
</template>
