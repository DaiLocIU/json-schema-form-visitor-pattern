// useVerticalResize.ts
import { onBeforeUnmount, onMounted, Ref } from 'vue'

export interface VerticalResizeOptions {
  min?: number              // default: 0
  max?: number              // default: +Infinity
  step?: number             // snap increment (px), default: 1
  initial?: number          // initial height (px)
  cssVar?: string           // mirror height to CSS var, e.g. '--panel-height'
  origin?: 'top' | 'bottom' // which edge the handle sits on; default: 'bottom'
}

export function useVerticalResize(
  elRef: Ref<HTMLElement | null>,
  onResize?: (height: number) => void, // fired on release
  onReset?: () => void,                // fired on reset()
  opts: VerticalResizeOptions = {}
) {
  const {
    min = 0,
    max = Number.POSITIVE_INFINITY,
    step = 1,
    initial,
    cssVar,
    origin = 'bottom',
  } = opts

  let active = false
  let startY = 0
  let startH = 0
  let prevBodyCursor = ''

  const writeHeight = (h?: number) => {
    const el = elRef.value
    if (!el) return
    const px = h != null ? `${h}px` : ''
    requestAnimationFrame(() => {
      el.style.height = px
      if (cssVar) {
        if (h != null) el.style.setProperty(cssVar, px)
        else el.style.removeProperty(cssVar)
      }
    })
  }

  function initResize(e: PointerEvent) {
    const el = elRef.value
    if (!el) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)

    requestAnimationFrame(() => {
      prevBodyCursor = document.body.style.cursor
      document.body.style.cursor = 'ns-resize'
    })

    active = true
    startY = e.clientY
    startH = el.offsetHeight

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', stop, { passive: true })
    window.addEventListener('blur', stop, { passive: true })
  }

  function onMove(e: PointerEvent) {
    if (!active) return
    const dy = e.clientY - startY
    const raw = origin === 'bottom' ? startH + dy : startH - dy
    const clamped = Math.max(min, Math.min(max, raw))
    const snapped = step > 1 ? Math.round(clamped / step) * step : clamped
    writeHeight(Math.ceil(snapped))
  }

  function stop() {
    if (!active) return
    active = false

    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('blur', stop)

    requestAnimationFrame(() => {
      document.body.style.cursor = prevBodyCursor
      prevBodyCursor = ''
    })

    const h = elRef.value?.offsetHeight
    if (typeof h === 'number') onResize?.(h)
  }

  function reset() {
    writeHeight(undefined)
    onReset?.()
  }

  onMounted(() => {
    if (initial != null) writeHeight(initial)
  })
  onBeforeUnmount(stop)

  return {
    initResize, // use on your handle: @pointerdown="e => initResize(e as PointerEvent)"
    reset,      // clear height & call onReset()
    setHeight: writeHeight, // optional programmatic setter
  }
}