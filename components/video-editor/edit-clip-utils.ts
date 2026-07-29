export const shortTime = (seconds: number) => {
    const safe = Math.max(0, seconds)
    const m = Math.floor(safe / 60)
    const s = Math.floor(safe % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const timelineMarkers = (duration: number) => {
    if (!duration) return [0]
    const step = duration > 60 ? 10 : 5
    return Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step)
}
