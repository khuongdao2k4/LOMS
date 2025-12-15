// Shared channel color palette (7 rainbow colors), deterministic per channel key
const CHANNEL_PALETTE = [
  { bg: "#d7191c", border: "#b11217", light: "rgba(227, 3, 6, 0.32)", text: "#ffffff" }, // red
  { bg: "#f28d1a", border: "#d97706", light: "rgba(238, 129, 5, 0.32)", text: "#0f172a" }, // orange
  { bg: "#eab308", border: "#c58a06", light: "rgba(191, 144, 4, 0.32)", text: "#0f172a" }, // yellow
  { bg: "#1c9c5c", border: "#15824b", light: "rgba(0, 163, 82, 0.3)", text: "#0b152d" }, // green
  { bg: "#2563eb", border: "#1d4ed8", light: "rgba(2, 61, 188, 0.3)", text: "#ffffff" }, // blue
  { bg: "#7c3aed", border: "#5b21b6", light: "rgba(82, 3, 219, 0.3)", text: "#ffffff" }, // purple
  { bg: "#db2777", border: "#be185d", light: "rgba(214, 4, 99, 0.3)", text: "#ffffff" }, // pink
]

const channelColorCache = new Map()
let nextColorIndex = 0
let loadedFromStorage = false
// bump key to refresh cached colors after palette change
const STORAGE_KEY = "channelColorMapV3"

const loadFromStorage = () => {
  if (loadedFromStorage || typeof window === "undefined") return
  loadedFromStorage = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && parsed.map && typeof parsed.map === "object") {
      Object.entries(parsed.map).forEach(([k, idx]) => {
        const colorIdx = Number(idx) % CHANNEL_PALETTE.length
        channelColorCache.set(k, CHANNEL_PALETTE[colorIdx])
      })
    }
    if (Number.isInteger(parsed?.next)) {
      nextColorIndex = parsed.next % CHANNEL_PALETTE.length
    } else {
      nextColorIndex = channelColorCache.size % CHANNEL_PALETTE.length
    }
  } catch {
    // ignore storage errors
  }
}

const persistToStorage = () => {
  if (typeof window === "undefined") return
  try {
    const obj = {
      map: {},
      next: nextColorIndex,
    }
    channelColorCache.forEach((_, key) => {
      // store index instead of full color
      const idx = CHANNEL_PALETTE.findIndex((c) => c === channelColorCache.get(key))
      obj.map[key] = idx >= 0 ? idx : 0
    })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // ignore storage errors
  }
}

const getChannelColor = (channelId, channelName, fallbackIndex = 0) => {
  loadFromStorage()
  const key = channelId || channelName || `channel-${fallbackIndex}`
  if (channelColorCache.has(key)) return channelColorCache.get(key)

  const color = CHANNEL_PALETTE[nextColorIndex % CHANNEL_PALETTE.length]
  channelColorCache.set(key, color)
  nextColorIndex = (nextColorIndex + 1) % CHANNEL_PALETTE.length
  persistToStorage()
  return color
}

export { CHANNEL_PALETTE, getChannelColor }
