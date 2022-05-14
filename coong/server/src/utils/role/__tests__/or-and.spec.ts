import {and, or} from '../'

describe('or', () => {
  it('should do or operation', async () => {
    const ok = () => true
    const no = () => false
    {
      const result = await or([no, ok])()
      expect(result).toBe(true)
    }
    {
      const result = await or([no, no])()
      expect(result).toBe(false)
    }
  })
  it('should do async or operation', async () => {
    const ok = () => Promise.resolve(true)
    const no = () => Promise.resolve(false)
    {
      const result = await or([ok, no])()
      expect(result).toBe(true)
    }
    {
      const result = await or([no, no])()
      expect(result).toBe(false)
    }
  })
  it('should do or operation with filter', async () => {
    const ok = () => ({foo: 'foo'})
    const no = () => false
    {
      const result = await or([ok, no], true)()
      expect(result).toEqual({foo: 'foo'})
    }
    {
      const result = await or([no, no])()
      expect(result).toBe(false)
    }
  })
  it('should do or async operation  ', async () => {
    const ok = () => Promise.resolve({foo: 'foo'})
    const no = () => Promise.resolve(false)
    {
      const result = await or([ok, no], true)()
      expect(result).toEqual({foo: 'foo'})
    }
    {
      const result = await or([no, no], true)()
      expect(result).toBe(false)
    }
  })
})
describe('and', () => {
  it('should do and operation', async () => {
    const ok = () => true
    const no = () => false
    {
      const result = await and([ok, ok])()
      expect(result).toBe(true)
    }
    {
      const result = await and([ok, no])()
      expect(result).toBe(false)
    }
    {
      const result = await and([no, no])()
      expect(result).toBe(false)
    }
  })
  it('should do async and operation', async () => {
    const ok = () => Promise.resolve(true)
    const no = () => Promise.resolve(false)
    {
      const result = await and([ok, ok])()
      expect(result).toBe(true)
    }
    {
      const result = await and([ok, no])()
      expect(result).toBe(false)
    }
    {
      const result = await and([no, no])()
      expect(result).toBe(false)
    }
  })
  it('should do and operation filter', async () => {
    const ok = () => ({foo: 'foo'})
    const ok2 = () => ({bar: 'bar'})
    const no = () => false
    {
      const result = await and([ok, ok2], true)()
      expect(result).toEqual({bar: 'bar', foo: 'foo'})
    }
    {
      const result = await and([ok, no], true)()
      expect(result).toBe(false)
    }
    {
      const result = await and([no, no], true)()
      expect(result).toBe(false)
    }
  })
  it('should do async and operation filter', async () => {
    const ok = () => Promise.resolve({foo: 'foo'})
    const ok2 = () => Promise.resolve({bar: 'bar'})
    const no = () => Promise.resolve(false)
    {
      const result = await and([ok, ok2], true)()
      expect(result).toEqual({bar: 'bar', foo: 'foo'})
    }
    {
      const result = await and([ok, no], true)()
      expect(result).toBe(false)
    }
    {
      const result = await and([no, no], true)()
      expect(result).toBe(false)
    }
  })
})
