import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PDocumentMetadata} from '../PDocumentMetadata'

const metadata = vi.hoisted(() => ({
  links: [] as Array<{href: string; rel: string; type?: string}>,
  location: {pathname: '/'},
  metas: [] as Array<{content: string; name?: string; property?: string}>,
  titles: [] as string[],
}))

vi.mock('@solidjs/meta', () => ({
  Link: (props: {href: string; rel: string; type?: string}) => {
    metadata.links.push({href: props.href, rel: props.rel, type: props.type})
    return null
  },
  Meta: (props: {content: string; name?: string; property?: string}) => {
    metadata.metas.push({
      content: props.content,
      ...(props.name === undefined ? {} : {name: props.name}),
      ...(props.property === undefined ? {} : {property: props.property}),
    })
    return null
  },
  Title: (props: {children: unknown}) => {
    metadata.titles.push(String(props.children))
    return null
  },
}))

vi.mock('@solidjs/router', () => ({useLocation: () => metadata.location}))
vi.mock('@paraglide/message', () => ({
  app_default_description: () => '기본 설명',
  app_home_description: () => '홈 설명',
  app_home_title: () => '홈 제목',
  version_catalog_metadata_description: () => '업데이트 내역 설명',
  version_notice_title: () => '새로운 소식',
}))
vi.mock('@paraglide/runtime', () => ({
  getLocale: () => 'en',
  getTextDirection: () => 'ltr',
}))
vi.mock('../../pomo-route', () => ({
  getCanonicalPathname: (pathname: string) => pathname.replace(/\/+$/u, '') || '/',
  isSearchIndexablePath: (pathname: string) =>
    ['/', '/refund-policy', '/third-party-notices', '/whats-new'].includes(
      pathname.replace(/\/+$/u, '') || '/',
    ),
  normalizePathname: (pathname: string) => pathname.replace(/\/+$/u, '') || '/',
}))

beforeEach(() => {
  document.documentElement.dir = 'rtl'
  document.documentElement.lang = 'ko'
  metadata.links.length = 0
  metadata.metas.length = 0
  metadata.titles.length = 0
})

afterEach(cleanup)

it('should synchronize the document language with the hydrated locale', () => {
  render(() => <PDocumentMetadata />)

  expect(document.documentElement.lang).toBe('en')
  expect(document.documentElement.dir).toBe('ltr')
})

it.each([
  ['/', '홈 제목', '홈 설명', 'index, follow'],
  ['/app-in-toss/privacy', 'Pomofi — 앱인토스 개인정보처리방침', '계정·세션 정보', 'noindex'],
  ['/refund-policy', 'Pomofi — 환불 및 청약철회 정책', '환불 및 청약철회 기준', 'index, follow'],
  ['/app-in-toss/terms', 'Pomofi — 앱인토스 서비스 이용약관', '이용 조건', 'noindex'],
  ['/terms', 'Pomofi — 서비스 이용약관', '이용 조건', 'noindex'],
  ['/web/terms', 'Pomofi — 서비스 이용약관', '이용 조건', 'noindex'],
  ['/privacy', 'Pomofi — 개인정보처리방침', '계정·세션 정보', 'noindex'],
  ['/web/privacy', 'Pomofi — 개인정보처리방침', '계정·세션 정보', 'noindex'],
  [
    '/third-party-notices',
    'Pomofi — 제3자 라이선스 및 배포 고지',
    '제3자 소프트웨어',
    'index, follow',
  ],
  ['/whats-new', 'Pomofi — 새로운 소식', '업데이트 내역', 'index, follow'],
  ['/dialogue/', 'Pomofi', '기본 설명', 'noindex'],
])('should render metadata for %s', (pathname, title, description, robots) => {
  metadata.location.pathname = pathname

  render(() => <PDocumentMetadata />)

  expect(metadata.titles).toEqual([title])
  expect(metadata.metas).toEqual(
    expect.arrayContaining([
      {content: expect.stringContaining(description), name: 'description'},
      {content: expect.stringContaining(robots), name: 'robots'},
      {content: title, property: 'og:title'},
      {content: expect.stringContaining(description), property: 'og:description'},
      {content: 'summary', name: 'twitter:card'},
      {content: title, name: 'twitter:title'},
    ]),
  )
  expect(metadata.links).toEqual([
    {
      href: `https://www.pomofi.io${pathname.replace(/\/+$/u, '') || '/'}`,
      rel: 'canonical',
      type: undefined,
    },
    {href: '/llms.txt', rel: 'describedby', type: 'text/markdown'},
  ])
})
