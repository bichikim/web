export const noNaN = (value: number, failValue: number = 0) => {
  if (Number.isNaN(value)) {
    return failValue
  }

  return value
}

export const numberTo = (value: number, failValue: number = 0) => {
  if (Number.isNaN(value)) {
    return failValue
  }

  return value
}
