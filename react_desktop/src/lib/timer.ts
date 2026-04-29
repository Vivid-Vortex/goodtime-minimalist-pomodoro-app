/**
 * Drift-corrected countdown. Uses Date.now() for the end time so
 * setInterval jitter doesn't accumulate.
 * Returns a cleanup fn that clears the interval.
 */
export function startCountdown(
  durationMs: number,
  onTick: (remainingMs: number) => void,
  onFinish: () => void,
): () => void {
  const endAt = Date.now() + durationMs

  function tick() {
    const remaining = endAt - Date.now()
    if (remaining <= 0) {
      onTick(0)
      clearInterval(id)
      onFinish()
    } else {
      onTick(remaining)
    }
  }

  tick()
  const id = setInterval(tick, 500)
  return () => clearInterval(id)
}
