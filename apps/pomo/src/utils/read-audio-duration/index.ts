/**
 * Reads a Blob's raw duration through browser audio metadata, returning null on a media error.
 * Owns its temporary URL and listeners until settlement; setup and cleanup exceptions reject unchanged.
 */
export const readAudioDuration = async (blob: Blob): Promise<number | null> => {
  const audio = globalThis.document.createElement('audio')
  const source = URL.createObjectURL(blob)
  const listeners = new AbortController()
  return new Promise<number | null>((resolve) => {
    const handleLoadedMetadata = () => resolve(audio.duration)
    const handleError = () => resolve(null)

    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', handleLoadedMetadata, {
      once: true,
      signal: listeners.signal,
    })
    audio.addEventListener('error', handleError, {once: true, signal: listeners.signal})
    audio.src = source
    audio.load()
  }).finally(() => {
    listeners.abort()
    audio.removeAttribute('src')
    URL.revokeObjectURL(source)
  })
}
