// useHorizontalResize.ts
import { onBeforeUnmount, onMounted, Ref } from 'vue'
export interface HorizontalResizeOptions {
  min?: number            // default: 0
  max?: number            // default: +Infinity
  step?: number           // snap increment (px), default: 1
  initial?: number        // initial width (px)
  cssVar?: string         // mirror width to CSS var (e.g. '--panel-width')
  origin?: 'left' | 'right' // which edge the handle sits on; default: 'right'
}

export function useHorizontalResize(
  elRef: Ref<HTMLElement | null>,
  onResize?: (width: number) => void,   // fired on pointerup with final width
  onReset?: () => void,                 // fired when reset is called
  opts: HorizontalResizeOptions = {}
) {
  const {
    min = 0,
    max = Number.POSITIVE_INFINITY,
    step = 1,
    initial,
    cssVar,
    origin = 'right',
  } = opts

  let active = false
  let startX = 0
  let startW = 0
  let prevBodyCursor = ''

  const writeWidth = (w?: number) => {
    const el = elRef.value
    if (!el) return
    const px = w != null ? `${w}px` : ''
    requestAnimationFrame(() => {
      el.style.width = px
      if (cssVar) {
        if (w != null) el.style.setProperty(cssVar, px)
        else el.style.removeProperty(cssVar)
      }
    })
  }

  function initResize(e: PointerEvent) {
    const el = elRef.value
    if (!el) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)

    // body cursor (no CSS class needed)
    requestAnimationFrame(() => {
      prevBodyCursor = document.body.style.cursor
      document.body.style.cursor = 'ew-resize'
    })

    active = true
    startX = e.clientX
    startW = el.offsetWidth

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', stop, { passive: true })
    window.addEventListener('blur', stop, { passive: true })
  }

  function onMove(e: PointerEvent) {
    if (!active) return
    const dx = e.clientX - startX
    const raw = origin === 'right' ? startW + dx : startW - dx
    const clamped = Math.max(min, Math.min(max, raw))
    const snapped = step > 1 ? Math.round(clamped / step) * step : clamped
    writeWidth(Math.ceil(snapped))
  }

  function stop() {
    if (!active) return
    active = false

    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('blur', stop)

    // restore cursor
    requestAnimationFrame(() => {
      document.body.style.cursor = prevBodyCursor
      prevBodyCursor = ''
    })

    const w = elRef.value?.offsetWidth
    if (typeof w === 'number') onResize?.(w)
  }

  function reset() {
    writeWidth(undefined)
    onReset?.()
  }

  // apply initial width once
  onMounted(() => {
    if (initial != null) writeWidth(initial)
  })

  onBeforeUnmount(() => stop())

  return {
    initResize, // attach to your handle: @pointerdown="e => initResize(e as PointerEvent)"
    reset,      // clear width & call onReset()
    setWidth: writeWidth, // optional: programmatic set
  }
}