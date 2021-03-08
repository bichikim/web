import {getPackage} from '../index'
import path from 'path'

describe('getPackage', function test() {
  it('should return a package object', function test() {
    const result = getPackage(path.resolve(__dirname))
    expect(result).toEqual({
      name: 'tests',
      dependencies: {},
      version: '1.0.0',
    })
  })
  it('should return empty object if there is no package.json', function test() {
    const result = getPackage(path.resolve(__dirname, '../'))
    expect(result).toEqual({})
  })
})
