/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {type AdminAlbum, getAlbumTranslation} from '../catalog'

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
