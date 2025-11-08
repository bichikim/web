/* eslint-disable require-unicode-regexp */
import {describe, expect, it} from 'vitest'
import {trimNewLine} from './trim-new-line'

describe('trigger', () => {
  it.each([
    //
    ':uno: opacity-10 bg-red',
    `:uno: opacity-10
    bg-red`,
    `:uno:
    opacity-10
    bg-red`,
  ])('should be a function', (input) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const trigger = /(["'`]):uno(?:-)?(?<name>[^\s\1]+)?:\s([^\1]*?)\1/g
    const quote = '`'

    const result = trigger.exec(`${quote}${input}${quote}`)

    expect(trimNewLine(result?.[0])).toBe('`:uno: opacity-10 bg-red`')
  })
})
