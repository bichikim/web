import {createInfoMap, getDescription, getIdentifier, getName, getPlayground, getRelates, setName, setPlayground} from '../info'

describe('info', () => {
  describe('createInfoMap', () => {
    it('should return info', () => {
      const info = createInfoMap()
      const target = {}
      info.set(target, {
        description: 'hello',
        identifier: 'unknown',
        name: 'foo',
      })
      expect(info.get(target)).toEqual({
        description: 'hello',
        identifier: 'unknown',
        name: 'foo',
        relates: new Set(),
      })
    })
  })
  const infoData = {
    description: 'hello',
    identifier: 'unknown',
    name: 'foo',
    playground: {args: ['foo']},
  }

  const info = createInfoMap()
  const target = {}
  info.set(target, {...infoData})

  afterEach(() => {
    info.set(target, {...infoData})
  })

  describe('getName', () => {
    it('should get name', () => {
      expect(getName(info, target)).toBe('foo')
    })
  })
  describe('getRelates', () => {
    it('should get name', () => {
      expect(getRelates(info, target)).toEqual(new Set())
    })
  })
  describe('getPlayground', () => {
    it('should get name', () => {
      expect(getPlayground(info, target)).toEqual({
        args: ['foo'],
      })
    })
  })
  describe('getDescription', () => {
    it('should get name', () => {
      expect(getDescription(info, target)).toBe('hello')
    })
  })
  describe('getIdentifier', () => {
    it('should get name', () => {
      expect(getIdentifier(info, target)).toBe('unknown')
    })
  })
  describe('setName', () => {
    it('should get name', () => {
      setName(info, target, 'foo')
      expect(getName(info, target)).toBe('foo')
    })
  })
  describe('setPlayground', () => {
    it('should get name', () => {
      setPlayground(info, target, {args: ['bar']})
      expect(getPlayground(info, target)).toEqual({
        args: ['bar'],
      })
    })
  })
})
