export interface StyleCss {
  bg?: number | string | (string | number)[]
  color?: number | string | (string | number)[]
}

const defaultArrayCount = 3

export const toFillArray = (value: any, number: number = defaultArrayCount) => {
  if (Array.isArray(value)) {
    const more: number = number - value.length
    if (more > 0) {
      return [...value, ...Array(more).fill(value[value.length - 1])]
    }
    return value
  }
  return Array(number).fill(value)
}
