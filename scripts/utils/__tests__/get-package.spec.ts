import {getPackage} from '../index'
import path from 'path'

describe('getPackage', () => {
  it('should return a package object', () => {
    const result = getPackage(path.resolve(__dirname))
    expect(result).toEqual({
      dependencies: {},
      name: 'tests',
      version: '1.0.0',
    })
  })
  it('should return empty object if there is no package.json', () => {
    const result = getPackage(path.resolve(__dirname, '../'))
    expect(result).toEqual({})
  })
})
