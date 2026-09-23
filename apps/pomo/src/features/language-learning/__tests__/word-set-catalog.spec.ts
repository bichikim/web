/** @vitest-environment node */
import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import wordSetIndex from '../../../../public/word-sets/index.json'
import englishB1 from '../../../../public/word-sets/english-b1.json'
import englishB2 from '../../../../public/word-sets/english-b2.json'
import {
  loadLanguageLearningWordSets,
  localizeLanguageLearningWordSet,
  parseLanguageLearningWordSet,
  parseLanguageLearningWordSetIndex,
} from '../word-set-catalog'

vi.mock('solid-js/web', () => ({getRequestEvent: vi.fn()}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'false')
  vi.stubEnv('POMO_PUBLIC_ASSET_ORIGIN', 'https://www.pomofi.io')
  vi.mocked(getRequestEvent).mockReturnValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('word set catalog', () => {
  it('should validate the public index and English B1 and B2 sets', () => {
    expect(parseLanguageLearningWordSetIndex(wordSetIndex)).toEqual(wordSetIndex)
    expect(parseLanguageLearningWordSet(englishB1)).toEqual(englishB1)
    expect(parseLanguageLearningWordSet(englishB2)).toEqual(englishB2)
  })

  it('should localize word set metadata for Korean and English', () => {
    const parsedEnglishB1 = parseLanguageLearningWordSet(englishB1)
    const parsedEnglishB2 = parseLanguageLearningWordSet(englishB2)

    expect(localizeLanguageLearningWordSet(parsedEnglishB1, 'ko')).toMatchObject({
      description: '중급 영어 학습자를 위해 Pomofi가 선별한 핵심 어휘예요.',
      title: '영어 B1',
    })
    expect(localizeLanguageLearningWordSet(parsedEnglishB2, 'en')).toMatchObject({
      description: 'Pomofi curated core vocabulary for upper-intermediate English learners.',
      title: 'English B2',
    })
  })

  it('should load word sets in manifest order', async () => {
    const responses = new Map<string, unknown>([
      ['/word-sets/index.json', wordSetIndex],
      ['/word-sets/english-b1.json', englishB1],
      ['/word-sets/english-b2.json', englishB2],
    ])
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const value = responses.get(String(input))
      return value === undefined
        ? new Response(null, {status: 404})
        : Response.json(value, {status: 200})
    })
    vi.stubGlobal('fetch', fetchMock)

    const sets = await loadLanguageLearningWordSets()

    expect(sets.map((set) => set.id)).toEqual(['english-b1', 'english-b2'])
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      '/word-sets/index.json',
      '/word-sets/english-b1.json',
      '/word-sets/english-b2.json',
    ])
  })

  it('should use the trusted public origin during SSR', async () => {
    vi.mocked(getRequestEvent).mockReturnValue({
      request: new Request('https://example.invalid/language-learning/word-sets'),
    } as ReturnType<typeof getRequestEvent>)
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(Response.json({sets: ['english-b1.json'], version: 1}))
      .mockResolvedValueOnce(Response.json(englishB1))

    await expect(loadLanguageLearningWordSets()).resolves.toEqual([englishB1])

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      'https://www.pomofi.io/word-sets/index.json',
      'https://www.pomofi.io/word-sets/english-b1.json',
    ])
  })

  it('should preserve the word set asset network failure message', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))

    await expect(loadLanguageLearningWordSets()).rejects.toThrow(
      'Failed to fetch language learning word set asset: /word-sets/index.json',
    )
  })

  it('should preserve the word set asset HTTP failure message', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 503}))

    await expect(loadLanguageLearningWordSets()).rejects.toThrow(
      'Failed to fetch language learning word set asset: 503',
    )
  })

  it('should preserve the word set asset JSON parse failure message', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{'))

    await expect(loadLanguageLearningWordSets()).rejects.toThrow(
      'Failed to parse language learning word set asset: /word-sets/index.json',
    )
  })

  it('should preserve the word set contract failure message for an invalid index', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({sets: [], version: 2}))

    await expect(loadLanguageLearningWordSets()).rejects.toThrow(
      'Invalid language learning word set index.',
    )
  })

  it('should preserve the word set contract failure message for an invalid asset', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({sets: ['english-b1.json'], version: 1}))
      .mockResolvedValueOnce(Response.json({...englishB1, words: []}))

    await expect(loadLanguageLearningWordSets()).rejects.toThrow(
      'Invalid language learning word set.',
    )
  })

  it('should reject an invalid word set', () => {
    expect(() => parseLanguageLearningWordSet({...englishB1, words: []})).toThrow(
      'Invalid language learning word set.',
    )
  })
})
