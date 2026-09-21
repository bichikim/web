import {Link, Meta, Title} from '@solidjs/meta'
import {useLocation} from '@solidjs/router'
import {onMount} from 'solid-js'
import {getCanonicalPathname, isSearchIndexablePath, normalizePathname} from '../pomo-route'
import {SEARCH_CONFIG} from 'src/features/search-discovery'
import {SERVICE_POLICY_PATHS} from '../../features/service-terms/policy-paths'
import * as m from '@paraglide/message'
import {getLocale, getTextDirection} from '@paraglide/runtime'

const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

const PRIVATE_ROBOTS = 'noindex, nofollow'
const SOCIAL_IMAGE_URL = new URL('/icons/512.png', SEARCH_CONFIG.origin).href

const getTitle = (pathname: string) => {
  switch (normalizePathname(pathname)) {
    case '/':
      return m.app_home_title()
    case SERVICE_POLICY_PATHS.appsInToss.privacy:
      return m.metadata_privacy_apps_in_toss_title()
    case SERVICE_POLICY_PATHS.refund:
      return m.metadata_refund_title()
    case SERVICE_POLICY_PATHS.appsInToss.terms:
      return m.metadata_terms_apps_in_toss_title()
    case SERVICE_POLICY_PATHS.legacy.terms:
    case SERVICE_POLICY_PATHS.web.terms:
      return m.metadata_terms_web_title()
    case SERVICE_POLICY_PATHS.legacy.privacy:
    case SERVICE_POLICY_PATHS.web.privacy:
      return m.metadata_privacy_web_title()
    case '/third-party-notices':
      return m.metadata_third_party_title()
    case '/whats-new':
      return `Pomofi — ${m.version_notice_title()}`
    default:
      return 'Pomofi'
  }
}

const getDescription = (pathname: string) => {
  switch (normalizePathname(pathname)) {
    case '/':
      return m.app_home_description()
    case SERVICE_POLICY_PATHS.refund:
      return m.metadata_refund_description()
    case SERVICE_POLICY_PATHS.appsInToss.privacy:
    case SERVICE_POLICY_PATHS.legacy.privacy:
    case SERVICE_POLICY_PATHS.web.privacy:
      return m.metadata_privacy_description()
    case SERVICE_POLICY_PATHS.appsInToss.terms:
    case SERVICE_POLICY_PATHS.legacy.terms:
    case SERVICE_POLICY_PATHS.web.terms:
      return m.metadata_terms_description()
    case '/third-party-notices':
      return m.metadata_third_party_description()
    case '/whats-new':
      return m.version_catalog_metadata_description()
    default:
      return m.app_default_description()
  }
}

export const PDocumentMetadata = () => {
  const location = useLocation()
  const locale = getLocale() === 'ko' ? 'ko_KR' : 'en_US'
  const canonicalUrl = () =>
    new URL(getCanonicalPathname(location.pathname), SEARCH_CONFIG.origin).href
  const description = () => getDescription(location.pathname)
  const title = () => getTitle(location.pathname)

  onMount(() => {
    const hydratedLocale = getLocale()

    document.documentElement.lang = hydratedLocale
    document.documentElement.dir = getTextDirection(hydratedLocale)
  })

  return (
    <>
      <Title>{title()}</Title>
      <Meta content={description()} name="description" />
      <Meta
        content={isSearchIndexablePath(location.pathname) ? INDEXABLE_ROBOTS : PRIVATE_ROBOTS}
        name="robots"
      />
      <Meta content="Pomofi" property="og:site_name" />
      <Meta content="website" property="og:type" />
      <Meta content={title()} property="og:title" />
      <Meta content={description()} property="og:description" />
      <Meta content={canonicalUrl()} property="og:url" />
      <Meta content={SOCIAL_IMAGE_URL} property="og:image" />
      <Meta content="Pomofi app icon" property="og:image:alt" />
      <Meta content={locale} property="og:locale" />
      <Meta content="summary" name="twitter:card" />
      <Meta content={title()} name="twitter:title" />
      <Meta content={description()} name="twitter:description" />
      <Meta content={SOCIAL_IMAGE_URL} name="twitter:image" />
      <Meta content="Pomofi app icon" name="twitter:image:alt" />
      <Link href={canonicalUrl()} rel="canonical" />
      <Link href="/llms.txt" rel="describedby" type="text/markdown" />
    </>
  )
}
