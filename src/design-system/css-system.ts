export interface StyleCss {
  bg?: number | string | (string | number)[]
  color?: number | string | (string | number)[]
}

export const toFillArray = (value: any, number: number = 3) => {
  if (Array.isArray(value)) {
    const more: number = number - value.length
    if (more > 0) {
      return [...value, ...Array(more).fill(value[value.length - 1])]
    }
    return value
  }
  return Array(number).fill(value)
}
