const compact = (value: any[]) => (value.filter(Boolean))

export const stringToArgs = (text: string) => {
  return compact(text.split(',').map((value) => {
    const _value = value.trim()
    if (/^".+"$/u.test(_value)) {
      return _value.replace(/^"+/u, '').replace(/"+$/u, '')
    }
    const number = Number(_value)
    if (Number.isNaN(number)) {
      return null
    }
    return number
  }))
}
