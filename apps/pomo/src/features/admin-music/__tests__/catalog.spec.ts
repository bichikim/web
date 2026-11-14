/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {type AdminAlbum, catalogSchema, getAlbumTranslation} from '../catalog'

const englishTranslation = {
  albumId: 'album-1',
  description: 'English description',
  locale: 'en',
  title: 'English title',
} satisfies AdminAlbum['translations'][number]

const koreanTranslation = {
  albumId: 'album-1',
  description: '한국어 설명',
  locale: 'ko',
  title: '한국어 제목',
} satisfies AdminAlbum['translations'][number]

const albumWithTranslations = {
  coverFallback: 'music',
  coverImageUrl: null,
  id: 'album-1',
  release: {blockers: [], ready: false},
  status: 'draft',
  translations: [englishTranslation, koreanTranslation],
} satisfies AdminAlbum

const albumWithoutKoreanTranslation = {
  ...albumWithTranslations,
  translations: [englishTranslation],
} satisfies AdminAlbum

describe('getAlbumTranslation', () => {
  it('should return the translation that matches the requested locale', () => {
    expect(getAlbumTranslation(albumWithTranslations, 'ko')).toEqual(koreanTranslation)
  })

  it('should return undefined when the requested locale is missing', () => {
    expect(getAlbumTranslation(albumWithoutKoreanTranslation, 'ko')).toBeUndefined()
  })
})

const offer = {
  albumId: 'album-1',
  billingType: 'one_time',
  externalProductId: 'product-1',
  productCode: 'album-product',
  productStatus: 'active',
  provider: 'apps-in-toss',
  status: 'inactive',
} as const

const catalog = {albums: [], assets: [], offers: [offer], pendingTracks: [], tracks: []}

describe('catalogSchema', () => {
  it.each(['lp', 'cd'] as const)(
    'should preserve the cover fallback %s in a catalog response',
    (coverFallback) => {
      const input = {...catalog, albums: [{...albumWithTranslations, coverFallback}]}

      expect(catalogSchema.parse(input)).toEqual(input)
    },
  )

  it.each(['draft', 'published', 'archived'] as const)(
    'should preserve the album status %s in a catalog response',
    (status) => {
      const input = {...catalog, albums: [{...albumWithTranslations, status}]}

      expect(catalogSchema.parse(input)).toEqual(input)
    },
  )

  it.each(['pending', 'uploaded', 'ready', 'active', 'failed', 'retired', 'deleted'] as const)(
    'should preserve the track asset status %s in a catalog response',
    (status) => {
      const input = {...catalog, assets: [{id: 'asset-1', status, trackId: 'track-1'}]}

      expect(catalogSchema.parse(input)).toEqual(input)
    },
  )

  it.each([
    {
      input: {...catalog, albums: [{...albumWithTranslations, coverFallback: 'draft'}]},
      path: ['albums', 0, 'coverFallback'],
      values: ['lp', 'cd', 'music'],
    },
    {
      input: {...catalog, albums: [{...albumWithTranslations, status: 'pending'}]},
      path: ['albums', 0, 'status'],
      values: ['draft', 'published', 'archived'],
    },
    {
      input: {...catalog, assets: [{id: 'asset-1', status: 'published', trackId: 'track-1'}]},
      path: ['assets', 0, 'status'],
      values: ['pending', 'uploaded', 'ready', 'active', 'failed', 'retired', 'deleted'],
    },
  ])('should retain the distinct allowed values and diagnostic order for $path', (test) => {
    const result = catalogSchema.safeParse(test.input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        {
          code: 'invalid_value',
          message: expect.any(String),
          path: test.path,
          values: test.values,
        },
      ])
    }
  })

  it.each([
    ['one_time', 'active', 'active'],
    ['one_time', 'active', 'inactive'],
    ['one_time', 'archived', 'active'],
    ['one_time', 'archived', 'inactive'],
    ['subscription', 'active', 'active'],
    ['subscription', 'active', 'inactive'],
    ['subscription', 'archived', 'active'],
    ['subscription', 'archived', 'inactive'],
  ] as const)(
    'should preserve the offer combination %s/%s/%s',
    (billingType, productStatus, status) => {
      const input = {...catalog, offers: [{...offer, billingType, productStatus, status}]}

      expect(catalogSchema.parse(input)).toEqual(input)
    },
  )

  it.each([
    ['billingType', 'active', ['one_time', 'subscription']],
    ['productStatus', 'inactive', ['active', 'archived']],
    ['status', 'archived', ['active', 'inactive']],
  ] as const)('should reject a value from a different category for %s', (field, value, values) => {
    const result = catalogSchema.safeParse({
      ...catalog,
      offers: [{...offer, [field]: value}],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([
        {
          code: 'invalid_value',
          message: expect.any(String),
          path: ['offers', 0, field],
          values,
        },
      ])
    }
  })
})
