/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {findJsonObjectEnd} from 'src/utils/json'

describe('findJsonObjectEnd', () => {
  it('should find the end of a nested JSON object with escaped braces in strings', () => {
    const json = JSON.stringify({items: [{name: '두부 {냉장} and "quoted"'}]})

    expect(findJsonObjectEnd(json, 0)).toBe(json.length - 1)
  })

  it('should return -1 when the object is incomplete or the start is not an object', () => {
    expect(findJsonObjectEnd('{"items": []', 0)).toBe(-1)
    expect(findJsonObjectEnd('[]', 0)).toBe(-1)
  })
})
