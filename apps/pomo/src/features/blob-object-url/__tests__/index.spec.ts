import {afterEach, expect, it, vi} from 'vitest'
import {replaceBlobObjectUrl} from '..'

afterEach(() => vi.restoreAllMocks())

it('should revoke the old URL before obtaining and creating its replacement', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const blob = new Blob(['audio'])
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
    expect(value).toBe(blob)
    return 'blob:new'
  })
  expect(
    replaceBlobObjectUrl('blob:old', () => {
      expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:old')
      expect(create).not.toHaveBeenCalled()
      return blob
    }),
  ).toBe('blob:new')
})

it('should clear without creating a URL and skip revocation when no URL exists', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const create = vi.spyOn(URL, 'createObjectURL')
  expect(replaceBlobObjectUrl(null, () => null)).toBeNull()
  expect(revoke).not.toHaveBeenCalled()
  expect(replaceBlobObjectUrl('blob:old', () => null)).toBeNull()
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:old')
  expect(create).not.toHaveBeenCalled()
})

it('should propagate creation failure after revoking the previous URL', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const failure = new Error('creation failed')
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    throw failure
  })
  expect(() => replaceBlobObjectUrl('blob:old', () => new Blob())).toThrow(failure)
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:old')
})
