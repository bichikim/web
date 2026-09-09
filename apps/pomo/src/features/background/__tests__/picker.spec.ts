/** @vitest-environment jsdom */
import {Device} from '@apps-in-toss/web-framework'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {pickNativeMedia} from '../picker'

vi.mock('@apps-in-toss/web-framework', () => ({Device: {getAlbumItems: vi.fn()}}))
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(Device.getAlbumItems, {isSupported: vi.fn(() => true)})
})
afterEach(() => vi.unstubAllGlobals())

it('should check native support before opening the album', async () => {
  vi.mocked(Device.getAlbumItems.isSupported).mockReturnValue(false)
  await expect(pickNativeMedia()).rejects.toThrow('UNSUPPORTED_APP_VERSION')
  expect(Device.getAlbumItems).not.toHaveBeenCalled()
})

it('should request both photos and videos and preserve media types', async () => {
  vi.mocked(Device.getAlbumItems).mockResolvedValue([
    {dataUri: 'data:image/jpeg;base64,YQ==', id: 'photo.jpg', type: 'PHOTO'},
    {dataUri: 'data:video/mp4;base64,Yg==', id: 'video.mp4', type: 'VIDEO'},
  ])
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      blob: async () =>
        new Blob(['media'], {type: url.includes('image') ? 'image/jpeg' : 'video/mp4'}),
      ok: true,
    })),
  )
  const files = await pickNativeMedia()
  expect(Device.getAlbumItems).toHaveBeenCalledWith({
    base64: true,
    maxCount: 10,
    maxWidth: 2560,
    types: ['PHOTO', 'VIDEO'],
  })
  expect(files.map((file) => file.type)).toEqual(['image/jpeg', 'video/mp4'])
})

it('should turn native photo base64 into a data URI before reading it', async () => {
  vi.mocked(Device.getAlbumItems).mockResolvedValue([{dataUri: 'YQ==', id: 'photo', type: 'PHOTO'}])
  const fetchMedia = vi.fn(async () => ({
    blob: async () => new Blob(['a'], {type: 'image/jpeg'}),
    ok: true,
  }))
  vi.stubGlobal('fetch', fetchMedia)
  await pickNativeMedia()
  expect(fetchMedia).toHaveBeenCalledWith('data:image/jpeg;base64,YQ==')
})

it('should treat cancelled selection as an empty list and reject unreadable media', async () => {
  vi.mocked(Device.getAlbumItems).mockResolvedValueOnce([])
  await expect(pickNativeMedia()).resolves.toEqual([])
  vi.mocked(Device.getAlbumItems).mockResolvedValueOnce([
    {dataUri: 'missing', id: 'video', type: 'VIDEO'},
  ])
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ok: false})),
  )
  await expect(pickNativeMedia()).rejects.toThrow('read selected album media')
})
