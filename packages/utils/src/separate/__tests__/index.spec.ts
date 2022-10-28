import {fnSeparate, separate} from '../'

describe('separate', () => {
  it('should separate list', () => {
    const [list, left] = separate(['$1', '$2', '$3', '4', '5', '6'], (item) => item.startsWith('$'))

    expect(list).toEqual(['$1', '$2', '$3'])
    expect(left).toEqual(['4', '5', '6'])
  })
})

describe('fn separator', () => {
  it('should separate list', () => {
    const [list, left] = fnSeparate((item) => item.startsWith('$'))([
      '$1',
      '$2',
      '$3',
      '4',
      '5',
      '6',
    ])

    expect(list).toEqual(['$1', '$2', '$3'])
    expect(left).toEqual(['4', '5', '6'])
  })
})
