export const getKeyboardLine = (key: string, line: number, last: number): number | null => {
  switch (key) {
    case 'ArrowUp':
      return Math.max(1, line - 1)
    case 'ArrowDown':
      return Math.min(last, line + 1)
    case 'Home':
      return 1
    case 'End':
      return last
    default:
      return null
  }
}
