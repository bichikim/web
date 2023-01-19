import {assignStyle} from '../'

describe('resolveStyle', () => {
  it('should resolve style with string and object', () => {
    expect(assignStyle('display: block;', {color: 'red'})).toEqual('display: block;color:red;')
  })
  it('should resolve style with object and object', () => {
    expect(assignStyle({display: 'block'}, 'color:red;')).toEqual('display:block;color:red;')
  })
  it('should resolve style with string and string', () => {
    expect(assignStyle('display: block;', 'color: red;')).toEqual('display: block;color: red;')
  })
  it('should resolve style with object and object', () => {
    expect(assignStyle({display: 'block'}, {color: 'red'})).toEqual('display:block;color:red;')
  })
  it('should resolve style with null and object', () => {
    expect(assignStyle(null, {color: 'red'})).toEqual('color:red;')
  })
  it('should resolve style with undefined and object', () => {
    expect(assignStyle(undefined, {color: 'red'})).toEqual('color:red;')
  })
  it('should resolve style with undefined and null', () => {
    expect(assignStyle(undefined, null)).toEqual('')
  })
})
