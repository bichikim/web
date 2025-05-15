const DEFAULT_BYTES_SIZE = 1024

export function toBytesSize(bytes: number, unit: number = DEFAULT_BYTES_SIZE): string {
  const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  if (bytes === 0) {
    return 'n/a'
  }

  const index: number = Number.parseInt(Math.floor(Math.log(bytes) / Math.log(unit)).toString(), 10)

  if (index === 0) {
    return `${bytes} ${sizes[index]}`
  }

  return `${(bytes / unit ** index).toFixed(1)} ${sizes[index]}`
}
