const BYTES_PER_KIBIBYTE = 1024
const BYTES_PER_MEGABYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const BYTES_PER_GIGABYTE = BYTES_PER_KIBIBYTE * BYTES_PER_MEGABYTE

/** Formats a model download size for user-facing consent copy. */
export const formatModelDownloadSize = (size: number) =>
  size >= BYTES_PER_GIGABYTE
    ? `약 ${(size / BYTES_PER_GIGABYTE).toFixed(1)}GB`
    : `약 ${Math.ceil(size / BYTES_PER_MEGABYTE)}MB`
