// create uid generator
export const createUidGenerator = (prefix: string = 'v'): ((prefix?: string) => string) => {
  let uid = 0
  return (_prefix: string = '') => {
    uid += 1
    if (_prefix) {
      return `${_prefix}-${prefix}${uid}`
    }
    return `${prefix}${uid}`
  }
}

export const uid = createUidGenerator()
