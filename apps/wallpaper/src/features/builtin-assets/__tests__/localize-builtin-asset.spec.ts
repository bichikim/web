import {expect, it} from 'vitest'
import catalog from '../../../../builtin-assets.json'
import {localizeBuiltinAsset} from '../localize-builtin-asset'

const names = [
  ['builtin:ash', 'Ash'],
  ['builtin:profile', 'Profile background'],
  ['builtin:street', 'Street background'],
  ['builtin:cover:window', 'Window'],
  ['builtin:cover:boot-laces', 'Boot laces'],
  ['builtin:cover:corner', 'Corner'],
  ['builtin:cover:shop-window', 'Shop window'],
  ['builtin:cover:lemon-soda', 'Lemon soda'],
  ['builtin:cover:blue-ribbon', 'Blue ribbon'],
  ['builtin:cover:one-earbud', 'One earbud'],
  ['builtin:cover:long-shadow', 'Long shadow'],
  ['builtin:cover:streetlamp', 'Streetlamp'],
  ['builtin:cover:doorstep', 'Doorstep'],
]

it.each(names)(
  'should localize %s while retaining its original Korean label and metadata',
  (id, name) => {
    const asset = [...catalog.puppets, ...catalog.media].find((item) => item.id === id)!
    expect(localizeBuiltinAsset(asset, 'en')).toEqual({...asset, name})
    expect(localizeBuiltinAsset(asset, 'ko')).toBe(asset)
  },
)

it('should preserve imported names that match builtin names and unknown builtin IDs', () => {
  const imported = {id: 'imported', name: '창문', size: 100}
  const unknown = {id: 'builtin:unknown', name: '프로필 배경'}
  expect(localizeBuiltinAsset(imported, 'en')).toBe(imported)
  expect(localizeBuiltinAsset(unknown, 'en')).toBe(unknown)
})
