import {describe, expect, it} from 'vitest'

import type {FeedRenderInput} from '../contract'
import {renderAtom} from '../render-atom'

const createInput = (): FeedRenderInput => ({
  definition: {
    description: '오늘 있었던 역사적 순간 & 이야기',
    homeUrl: 'https://pomo.example/history?language=ko&view=all',
    language: 'ko-KR',
    slug: 'today-in-history',
    title: '오늘의 <역사>',
  },
  entries: [
    {
      id: 'urn:pomo:history:past',
      publishedAt: '2026-08-14T00:00:00.000Z',
      summary: '과거 항목',
      title: '과거',
      updatedAt: '2026-08-15T13:00:00.000Z',
      url: 'https://pomo.example/history/past',
    },
    {
      contentHtml: '<p>역사적 "순간" & 기록</p>',
      id: 'urn:pomo:history:present&stable',
      publishedAt: '2026-08-15T00:00:00.000Z',
      summary: '현재 <항목>의 요약',
      title: '현재 & 오늘',
      url: 'https://pomo.example/history/present?source="archive"&owner=민수\'s',
    },
  ],
  selfUrl: "https://pomo.example/api/feeds/today-in-history/atom.xml?mode=full&owner=민수's",
  updatedAt: '2026-08-15T13:00:00.000Z',
})

describe('renderAtom', () => {
  it('should render deterministic Atom with escaped links and HTML content', () => {
    const input = createInput()
    const document = renderAtom(input)

    expect(renderAtom(input)).toBe(document)
    expect(document).toContain('<title>오늘의 &lt;역사&gt;</title>')
    expect(document).toContain('<subtitle>오늘 있었던 역사적 순간 &amp; 이야기</subtitle>')
    expect(document).toContain('xml:lang="ko-KR"')
    expect(document).toContain(
      'href="https://pomo.example/history/present?source=&quot;archive&quot;&amp;owner=민수&apos;s"',
    )
    expect(document).toContain('<id>urn:pomo:history:present&amp;stable</id>')
    expect(document).toContain(
      '<content type="html">&lt;p&gt;역사적 "순간" &amp; 기록&lt;/p&gt;</content>',
    )
  })

  it('should remove XML 1.0-disallowed characters while preserving valid text and attributes', () => {
    const input = createInput()
    const [entry] = input.entries

    if (entry === undefined) {
      throw new Error('Expected the fixture entry to exist')
    }

    const disallowedCharacters = '\u0000\u0001\u0008\u000B\u000C\u001F\uD800\uFFFE\uFFFF\uDFFF'
    const validText = '시작\t탭\n다음 줄\r복귀\uD7FF\uE000\uFFFD 😀끝'
    const entryUrl = `https://pomo.example/history/sample?discard=${disallowedCharacters}&emoji=😀&title="기록"&owner=민수's`
    const document = renderAtom({
      ...input,
      entries: [
        {
          ...entry,
          summary: `${validText}${disallowedCharacters}`,
          title: `${validText}${disallowedCharacters}`,
          url: entryUrl,
        },
      ],
    })

    const parsed = new DOMParser().parseFromString(document, 'application/xml')
    expect(parsed.querySelector('parsererror')).toBeNull()
    expect(document).toContain(`<title>${validText}</title>`)

    const atomEntry = parsed.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'entry').item(0)
    expect(
      atomEntry?.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'title').item(0)
        ?.textContent,
    ).toBe(validText.replaceAll('\r', '\n'))
    expect(
      atomEntry
        ?.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'link')
        .item(0)
        ?.getAttribute('href'),
    ).toBe('https://pomo.example/history/sample?discard=&emoji=😀&title="기록"&owner=민수\'s')
  })

  it('should sort by publication date while preserving each update date', () => {
    const document = renderAtom(createInput())

    expect(document.indexOf('urn:pomo:history:present')).toBeLessThan(
      document.indexOf('urn:pomo:history:past'),
    )
    expect(document).toContain('<published>2026-08-15T00:00:00.000Z</published>')
    expect(document).toContain('<updated>2026-08-15T13:00:00.000Z</updated>')
  })

  it('should use the publication date as the entry update date and omit optional content', () => {
    const input = createInput()
    const [presentEntry] = input.entries.slice(1)

    if (presentEntry === undefined) {
      throw new Error('Expected the fixture entry to exist')
    }

    const document = renderAtom({...input, entries: [{...presentEntry, contentHtml: undefined}]})

    expect(document).toContain('<updated>2026-08-15T00:00:00.000Z</updated>')
    expect(document).not.toContain('<content type="html">')
  })

  it('should omit entry markup when entries are absent', () => {
    const input = createInput()

    expect(renderAtom({...input, entries: []})).not.toContain('<entry>')
  })
})
