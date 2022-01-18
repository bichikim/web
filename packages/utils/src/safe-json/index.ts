export const parseJson = (value: string, defaultValue: any = null) => {
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

export const stringifyJson = (value: any) => {
  try {
    return JSON.stringify(value)
  } catch {
    return '""'
  }
}

