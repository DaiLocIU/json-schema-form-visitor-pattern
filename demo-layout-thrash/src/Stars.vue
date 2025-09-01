<template>
  <main class="wrap">
    <h1>50 Stars — Bad (write→read→write) vs Best (all reads → all writes)</h1>

    <div class="row">
      <label>Mode:
        <select v-model="mode">
          <option value="bad">Bad (thrash)</option>
          <option value="best">Best (batched)</option>
        </select>
      </label>
      <label>
        Scheduler:
        <select v-model="scheduler" :disabled="mode !== 'best'">
          <option value="fdom">FasterDOM (measure/mutation)</option>
          <option value="raf">requestAnimationFrame</option>
        </select>
      </label>
      <button class="btn" @click="stepOnce">Step once</button>
      <button class="btn" @click="toggleAuto">{{ autoLabel }}</button>
      <span class="hint">Tip: DevTools → Rendering → Frame Rendering Stats to see dropped frames.</span>
    </div>

    <div ref="stageRef" class="stage" aria-label="night sky">
      <div
        v-for="i in stars"
        :key="i"
        class="star"
        :ref="setStarRef(i-1)"
      >★</div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { requestMeasure, requestMutation } from './libs/fasterdom/fasterdom'

// ---------- config ----------
const COUNT = 2000
const STEP_INTERVAL_MS = 16  // ~10 updates/s to make differences obvious
const BASE_SCALE = 1
const MAX_EXTRA_SCALE = 0.6   // scale increases with speed (visual only)

// ---------- state ----------
const stageRef = ref(null)
const stars = ref(Array.from({ length: COUNT }, (_, i) => i + 1))
const starEls = ref(Array(COUNT).fill(null))
const mode = ref('bad') // 'bad' | 'best'
const scheduler = ref('fdom') // 'fdom' | 'raf'
let timer = null

// ---------- helpers ----------
function setStarRef(idx) {
  return (el) => { if (el) starEls.value[idx] = el }
}

function rand01() { return Math.random() }
function drift()  { return (rand01() - 0.5) * 60 } // -30..30 px

function clamp(x, y, stageRect) {
  const m = 6
  return {
    x: Math.max(m, Math.min(stageRect.width  - m, x)),
    y: Math.max(m, Math.min(stageRect.height - m, y)),
  }
}
function scaleForSpeed(px) {
  return BASE_SCALE + Math.min(MAX_EXTRA_SCALE, px / 60)
}

// initial placement
async function placeRandom() {
  await nextTick()
  const stage = stageRef.value
  if (!stage) return
  const w = stage.clientWidth
  const h = stage.clientHeight
  for (const el of starEls.value) {
    if (!el) continue
    const x = Math.random() * w
    const y = Math.random() * h
    el.style.left = x + 'px'
    el.style.top  = y + 'px'
    el.style.transform = 'translate(-50%, -50%) scale(1)'
  }
}

onMounted(placeRandom)
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

// ---------- per-step logic ----------
function stepBad() {
  const stage = stageRef.value
  if (!stage) return
  // Read container once (not thrashy)
  const stageRect = stage.getBoundingClientRect()

  for (const el of starEls.value) {
    if (!el) continue

    // READ current rect (meaningful: "based on current position")
    const oldRect = el.getBoundingClientRect()
    const currX = oldRect.left - stageRect.left
    const currY = oldRect.top  - stageRect.top

    // Propose next (unclamped) from current
    const candX = currX + drift()
    const candY = currY + drift()

    // WRITE #1: set candidate position (layout-affecting)
    el.style.left = candX + 'px'
    el.style.top  = candY + 'px'

    // READ #2: measure actual new rect AFTER the write (forces layout)
    const newRect = el.getBoundingClientRect()

    // Compute speed from actual DOM movement (meaningful use of the read)
    const speed = Math.hypot(newRect.left - oldRect.left, newRect.top - oldRect.top)

    // Clamp AFTER write using measured position (still meaningful)
    const relX = newRect.left - stageRect.left
    const relY = newRect.top  - stageRect.top
    const clamped = clamp(relX, relY, stageRect)

    // WRITE #2: apply clamped position + visual scale
    el.style.left = clamped.x + 'px'
    el.style.top  = clamped.y + 'px'
    el.style.transform = `translate(-50%, -50%) scale(${scaleForSpeed(speed)})`
  }
}

function stepBest() {
  const stage = stageRef.value
  if (!stage) return

  // Branch by scheduler: FasterDOM vs requestAnimationFrame
  if (scheduler.value === 'raf') {
    console.log('useeee raf')
    // RAF-based two-phase batching (reads → writes)
    const targets = new Array(starEls.value.length)
    requestAnimationFrame(() => {
      const stageRect = stage.getBoundingClientRect()
      for (let i = 0; i < starEls.value.length; i++) {
        const el = starEls.value[i]
        if (!el) continue
        const oldRect = el.getBoundingClientRect()
        const currX = oldRect.left - stageRect.left
        const currY = oldRect.top  - stageRect.top

        const candX = currX + drift()
        const candY = currY + drift()
        const clamped = clamp(candX, candY, stageRect)

        const speed = Math.hypot(clamped.x - currX, clamped.y - currY)
        const scale = scaleForSpeed(speed)
        targets[i] = { el, x: clamped.x, y: clamped.y, scale }
      }

      requestAnimationFrame(() => {
        for (const t of targets) {
          if (!t) continue
          t.el.style.left = t.x + 'px'
          t.el.style.top  = t.y + 'px'
          t.el.style.transform = `translate(-50%, -50%) scale(${t.scale})`
        }
      })
    })
  } else {
      console.log('useeee fasterdom')
    // FasterDOM-based batching (measure → mutation)
     const targets = new Array(starEls.value.length)
 
    requestMeasure(() => {
      requestMutation(() => {
        for (const t of targets) {
          if (!t) continue
          t.el.style.left = t.x + 'px'
          t.el.style.top  = t.y + 'px'
          t.el.style.transform = `translate(-50%, -50%) scale(${t.scale})`
        }
      })
      const stageRect = stage.getBoundingClientRect()
    
      for (let i = 0; i < starEls.value.length; i++) {
        const el = starEls.value[i]
        if (!el) continue
        const oldRect = el.getBoundingClientRect()
        const currX = oldRect.left - stageRect.left
        const currY = oldRect.top  - stageRect.top

        const candX = currX + drift()
        const candY = currY + drift()
        const clamped = clamp(candX, candY, stageRect)

        const speed = Math.hypot(clamped.x - currX, clamped.y - currY)
        const scale = scaleForSpeed(speed)
        targets[i] = { el, x: clamped.x, y: clamped.y, scale }
      }
        
    })
  }
}


function stepOnce() {
  if (mode.value === 'bad') stepBad()
  else stepBest()
}

const autoLabel = ref('Auto: OFF')
function toggleAuto() {
  if (timer) {
    clearInterval(timer); timer = null
    autoLabel.value = 'Auto: OFF'
  } else {
    timer = setInterval(stepOnce, STEP_INTERVAL_MS)
    autoLabel.value = 'Auto: ON'
  }
}
</script>

<style scoped>
.wrap { max-width: 960px; margin: 16px auto; padding: 0 12px; color:#e2e8f0; }
h1 { margin: 0 0 8px; font-size: 20px; }
.row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
select, .btn { padding:8px 10px; border-radius:8px; border:1px solid #334155; background:#0b1220; color:#e2e8f0; cursor:pointer; }
.hint { color:#94a3b8; }

.stage {
  position: relative; height: 520px; overflow: hidden;
  border: 1px solid #1f2937; border-radius: 12px;
  background: radial-gradient(ellipse at center, #0b1020 0%, #070a14 100%);
}
.star {
  position: absolute; width: 10px; height: 10px;
  color: #ffd166; font-size: 12px; pointer-events: none;
  transform: translate(-50%, -50%) scale(1);
  will-change: left, top, transform;
  text-shadow: 0 0 6px rgba(255, 209, 102, .8);
}
</style>
