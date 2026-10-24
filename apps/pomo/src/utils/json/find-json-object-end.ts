export const findJsonObjectEnd = (text: string, start: number): number => {
  if (text[start] !== '{') {
    return -1
  }

  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (character === '\\') {
        isEscaped = true
      } else if (character === '"') {
        inString = false
      }
    } else if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}
