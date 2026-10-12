/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {convertUnit, getUnits} from '../features/tools/units'

const resolveUnitPair = (
  selection: {readonly category: 'area'; readonly from: string; readonly to: string},
  locale: string,
) => {
  const options = getUnits(selection.category, locale).map((unit) => unit.id)

  const source = options.includes(selection.from) ? selection.from : options[0]
  const target = options.includes(selection.to) ? selection.to : options[1]

  return {from: source, to: target}
}

describe('unit converter locale fallback', () => {
  const storedSelection = {category: 'area' as const, from: 'pyeong', to: 'm2'}

  it('should still convert one pyeong to square meters when locale is English', () => {
    const resolved = resolveUnitPair(storedSelection, 'en')

    expect(resolved).toEqual({from: 'pyeong', to: 'm2'})
    expect(convertUnit({from: resolved.from, to: resolved.to, value: '1'})).toEqual({
      kind: 'valid',
      value: 400 / 121,
    })
  })
})
