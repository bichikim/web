import * as m from '@paraglide/message'

const BYTES_PER_KIBIBYTE = 1024
const BYTES_PER_MEGABYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const BYTES_PER_GIGABYTE = BYTES_PER_KIBIBYTE * BYTES_PER_MEGABYTE

/** Formats a model download size for user-facing consent copy. */
export const formatModelDownloadSize = (size: number): string =>
  size >= BYTES_PER_GIGABYTE
    ? m.model_download_size_about({size: `${(size / BYTES_PER_GIGABYTE).toFixed(1)}GB`})
    : m.model_download_size_about({size: `${Math.ceil(size / BYTES_PER_MEGABYTE)}MB`})

export const localizeModelDownloadSize = (size: string): string => {
  const amount = size.replace(/^(?:약|about)\s+/u, '')

  return amount === size ? size : m.model_download_size_about({size: amount})
}
