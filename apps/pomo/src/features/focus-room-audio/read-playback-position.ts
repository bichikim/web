/** Reads a nonnegative position once; missing or non-finite values return null. */
export const readPlaybackPosition = (element: HTMLAudioElement | undefined): number | null => {
  const positionSeconds = element?.currentTime
  return positionSeconds !== undefined && Number.isFinite(positionSeconds)
    ? Math.max(0, positionSeconds)
    : null
}
