import {getOutside} from '../'

describe('getOutside', () => {
  it('should return position over left', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: -5,
        y: 10,
      },
      {
        height: 150,
        width: 100,
        x: 0,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: -5,
      y: 0,
    })
  })
  it('should return position over right', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 51,
        y: 10,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: 1,
      y: 0,
    })
  })
  it('should return position over top', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 50,
        y: -1,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: 0,
      y: -1,
    })
  })
  it('should return position over bottom', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 50,
        y: 51,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: 0,
      y: 1,
    })
  })
  it('should return position in the screen', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 50,
        y: 50,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: 0,
      y: 0,
    })
  })
  it('should return position over left none 0 screen position', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 0,
        y: 10,
      },
      {
        height: 150,
        width: 100,
        x: 10,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: -10,
      y: 0,
    })
  })
  it('should return position over right none 0 screen position', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 41,
        y: 10,
      },
      {
        height: 150,
        width: 150,
        x: -10,
        y: 0,
      },
    )
    expect(result).toEqual({
      x: 1,
      y: 0,
    })
  })
  it('should return position over top none 0 screen position', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 50,
        y: -1,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: 10,
      },
    )
    expect(result).toEqual({
      x: 0,
      y: -11,
    })
  })
  it('should return position over bottom none 0 screen position', () => {
    const result = getOutside(
      {
        height: 100,
        width: 100,
        x: 50,
        y: 41,
      },
      {
        height: 150,
        width: 150,
        x: 0,
        y: -10,
      },
    )
    expect(result).toEqual({
      x: 0,
      y: 1,
    })
  })
})
