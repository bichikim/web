import {expect, it} from 'vitest'
import {selectFolderPhotos} from '../select-folder-photos'

const photo = (path: string, type = 'image/png', content = 'photo') => {
  const file = new File([content], path.split('/').at(-1)!, {type})
  Object.defineProperty(file, 'webkitRelativePath', {value: path})
  return file
}

it.each([
  {depth: 0, paths: ['album/root.png']},
  {depth: 1, paths: ['album/root.png', 'album/trip/same.png']},
  {depth: 2, paths: ['album/root.png', 'album/trip/same.png', 'album/trip/day/same.png']},
  {depth: null, paths: ['album/root.png', 'album/trip/same.png', 'album/trip/day/same.png']},
])(
  'should include photos up to depth $depth with the selected folder at zero',
  ({depth, paths}) => {
    const files = [
      photo('album/root.png'),
      photo('album/trip/same.png'),
      photo('album/trip/day/same.png'),
    ]
    expect(selectFolderPhotos(files, depth).map((file) => file.webkitRelativePath)).toEqual(paths)
    expect(files).toHaveLength(3)
  },
)

it('should skip videos, other files, empty photos and files without folder paths', () => {
  const valid = photo('album/image.png')
  expect(
    selectFolderPhotos([
      photo('album/movie.mp4', 'video/mp4'),
      photo('album/note.txt', 'text/plain'),
      photo('album/empty.png', 'image/png', ''),
      photo('standalone.png'),
      valid,
    ]),
  ).toEqual([valid])
})

it('should preserve file identity and selection order, including repeated filenames', () => {
  const files = [photo('album/z/same.png'), photo('album/a/same.png')]
  const selected = selectFolderPhotos(files)
  expect(selected).toEqual(files)
  expect(selected[0]).toBe(files[0])
})

it('should return no photos for an empty selection', () => {
  expect(selectFolderPhotos([])).toEqual([])
})

it.each([-1, 0.5, NaN, Infinity])('should reject an invalid maximum depth of %s', (depth) => {
  expect(() => selectFolderPhotos([], depth)).toThrow(RangeError)
})
