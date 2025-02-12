import {describe, expect, test} from 'vitest'
import {renderDiamond, renderHalfDiamond, renderRaw} from '../'

describe('renderRaw', () => {
  test('render row text', () => {
    expect(renderRaw(5, 1)).toBe('    *    ')
    expect(renderRaw(5, 3)).toBe('   ***   ')
  })
})

describe('renderHalfDiamond', () => {
  test('render diamond text', () => {
    expect(renderHalfDiamond(5)).toBe(
      '    *    \n   ***   \n  *****  \n ******* \n*********',
    )
    expect(renderHalfDiamond(4)).toBe('   *   \n  ***  \n ***** \n*******')
    expect(renderHalfDiamond(3)).toBe('  *  \n *** \n*****')
    expect(renderHalfDiamond(2)).toBe(' * \n***')
    expect(renderHalfDiamond(1)).toBe('*')
  })

  test('opposite direction', () => {
    expect(renderHalfDiamond(5, true)).toBe(
      '*********\n ******* \n  *****  \n   ***   \n    *    ',
    )
    expect(renderHalfDiamond(4, true)).toBe('*******\n ***** \n  ***  \n   *   ')
    expect(renderHalfDiamond(3, true)).toBe('*****\n *** \n  *  ')
    expect(renderHalfDiamond(2, true)).toBe('***\n * ')
    expect(renderHalfDiamond(1, true)).toBe('*')
  })

  test('opposite direction padding', () => {
    expect(renderHalfDiamond(5, true)).toBe(
      '*********\n ******* \n  *****  \n   ***   \n    *    ',
    )

    expect(renderHalfDiamond(4, true, 1)).toBe(
      ' ******* \n  *****  \n   ***   \n    *    ',
    )
    expect(renderHalfDiamond(3, true, 1)).toBe(' ***** \n  ***  \n   *   ')
    expect(renderHalfDiamond(2, true, 1)).toBe(' *** \n  *  ')
    expect(renderHalfDiamond(1, true, 1)).toBe(' * ')
  })
})

describe('renderDiamond', () => {
  test('render diamond text', () => {
    expect(renderDiamond(5)).toBe(
      '    *    \n   ***   \n  *****  \n ******* \n*********\n ******* \n  *****  \n   ***   \n    *    ',
    )

    expect(renderDiamond(4)).toBe(
      '   *   \n  ***  \n ***** \n*******\n ***** \n  ***  \n   *   ',
    )
    expect(renderDiamond(3)).toBe('  *  \n *** \n*****\n *** \n  *  ')
    expect(renderDiamond(2)).toBe(' * \n***\n * ')
    expect(renderDiamond(1)).toBe('*')
  })
})
