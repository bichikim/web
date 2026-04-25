export const truncateWithEllipsis = (value: string, maxLength: number): string => {
  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`
}
