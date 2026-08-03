const DEFAULT_BYTES_SIZE = 1024
const SIZE_NAMES = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number, unit: number = DEFAULT_BYTES_SIZE): string {
  if (!Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(unit) || unit <= 1) {
    return 'n/a'
  }

  const calculatedIndex = Math.floor(Math.log(bytes) / Math.log(unit))
  const index = Math.min(Math.max(calculatedIndex, 0), SIZE_NAMES.length - 1)

  if (index === 0) {
    return `${bytes} ${SIZE_NAMES[index]}`
  }

  // oxlint-disable-next-line eslint-js/no-mixed-operators
  return `${(bytes / unit ** index).toFixed(1)} ${SIZE_NAMES[index]}`
}

/** @deprecated Use `formatBytes` instead. */
export const toBytesSize = formatBytes
