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
  app_default_description: () => 'Default description',
  app_home_description: () => 'Home description',
  app_home_title: () => 'Home title',
  metadata_privacy_apps_in_toss_title: () => 'Apps in Toss privacy title',
  metadata_privacy_description: () => 'Privacy description',
  metadata_privacy_web_title: () => 'Web privacy title',
  metadata_refund_description: () => 'Refund description',
  metadata_refund_title: () => 'Refund title',
  metadata_terms_apps_in_toss_title: () => 'Apps in Toss terms title',
  metadata_terms_description: () => 'Terms description',
  metadata_terms_web_title: () => 'Web terms title',
  metadata_third_party_description: () => 'Third-party description',
  metadata_third_party_title: () => 'Third-party title',
  version_catalog_metadata_description: () => 'Version description',
  version_notice_title: () => "What's new",
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
  ['/', 'Home title', 'Home description', 'index, follow'],
  ['/app-in-toss/privacy', 'Apps in Toss privacy title', 'Privacy description', 'noindex'],
  ['/refund-policy', 'Refund title', 'Refund description', 'index, follow'],
  ['/app-in-toss/terms', 'Apps in Toss terms title', 'Terms description', 'noindex'],
  ['/terms', 'Web terms title', 'Terms description', 'noindex'],
  ['/web/terms', 'Web terms title', 'Terms description', 'noindex'],
  ['/privacy', 'Web privacy title', 'Privacy description', 'noindex'],
  ['/web/privacy', 'Web privacy title', 'Privacy description', 'noindex'],
  ['/third-party-notices', 'Third-party title', 'Third-party description', 'index, follow'],
  ['/whats-new', "Pomofi — What's new", 'Version description', 'index, follow'],
  ['/dialogue/', 'Pomofi', 'Default description', 'noindex'],
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
