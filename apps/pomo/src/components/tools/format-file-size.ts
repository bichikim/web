const BYTES_PER_MEGABYTE = 1_000_000

export const formatFileSize = (size: number): string => {
  const kilobyte = 1_000
  const unit = size < kilobyte ? 'byte' : size < BYTES_PER_MEGABYTE ? 'kilobyte' : 'megabyte'
  const divisor = size < kilobyte ? 1 : size < BYTES_PER_MEGABYTE ? kilobyte : BYTES_PER_MEGABYTE
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'unit',
    unit,
  }).format(size / divisor)
}
