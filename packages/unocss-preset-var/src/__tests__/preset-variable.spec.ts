import {describe, expect, it} from 'vitest'
import {createVariableMatcher} from '../preset-variable'
import {parseColor, theme} from 'unocss/preset-mini'
import {createGenerator} from '@unocss/core'

describe('createVariableMatcher', () => {
  it('should work with color', async () => {
    const matcher = createVariableMatcher('--un')

    expect(matcher(['', 'foo', 'red-400'], {generator: await createGenerator(), theme} as any)).toEqual({
      '--un-foo': 'rgb(248 113 113 / var(--un-bg-opacity, 1))',
    })
  })

  it('should work with color and opacity', async () => {
    const matcher = createVariableMatcher('--un')

    expect(
      matcher(['', 'foo', 'red-400/50'], {
        generator: await createGenerator(),
        theme,
      } as any),
    ).toEqual({
      '--un-foo': 'rgb(248 113 113 / 0.5)',
    })
  })

  it('should work with number', async () => {
    const matcher = createVariableMatcher('--un')

    expect(matcher(['', 'foo', '100'], {generator: await createGenerator(), theme} as any)).toEqual({
      '--un-foo': '100',
    })
  })
})
