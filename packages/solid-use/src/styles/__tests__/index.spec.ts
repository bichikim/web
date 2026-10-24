import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {sx, toStringStyle, useStyles} from '../index'

describe('toStringStyle', () => {
  it('should serialize every CSS property', () => {
    expect(toStringStyle({color: 'red', display: 'block'})).toBe('color: red;display: block;')
  })
})

describe('sx', () => {
  it('should preserve strings and undefined values', () => {
    expect(sx('color: red')).toBe('color: red')
    expect(sx(undefined)).toBeUndefined()
  })

  it('should serialize style objects', () => {
    expect(sx({color: 'red'})).toBe('color: red;')
  })
})

describe('useStyles', () => {
  it('should reactively combine style entries', () => {
    createRoot((dispose) => {
      const [styles, setStyles] = createSignal<Array<string | {color: string}>>([
        {color: 'red'},
        'display: block',
      ])
      const style = useStyles(styles)

      expect(style()).toBe('color: red;;display: block')

      setStyles(['color: blue'])

      expect(style()).toBe('color: blue')
      dispose()
    })
  })
})
