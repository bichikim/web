function removeAll(target: string, remove: string) {
  let next = target
  for (const char of remove) {
    const result = next.replace(char, '')
    if (result === next) {
      return target
    }
    next = result
  }
  return next
}

function solution(S: string) {
  let prev = S
  let count = 0
  // eslint-disable-next-line
  while (count < 200000) {
    const result = removeAll(prev, 'BALLOON')
    if (result === prev) {
      return count
    }
    prev = result
    count += 1
  }
  return count
}

describe('solution', () => {
  it('should return number', () => {
    expect(solution('BAONXXOLL')).toBe(1)
    expect(solution('BAOOLLNNOLOLGBAX')).toBe(2)
    expect(solution('QAWABAWONL')).toBe(0)
    expect(solution('ONLABLABLOON')).toBe(1)
  })
})
