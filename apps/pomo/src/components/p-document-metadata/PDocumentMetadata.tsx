import {Link, Meta, Title} from '@solidjs/meta'
import {useLocation} from '@solidjs/router'
import {onMount} from 'solid-js'
import {getCanonicalPathname, isSearchIndexablePath, normalizePathname} from '../pomo-route'
import {SEARCH_CONFIG} from 'src/features/search-discovery'
import {SERVICE_POLICY_PATHS} from '../../features/service-terms/policy-paths'
import * as m from '@paraglide/message'
import {getLocale, getTextDirection} from '@paraglide/runtime'

const REFUND_POLICY_DESCRIPTION =
  'Pomofi 앱인토스 곡·앨범 단위 음악 이용권의 환불 및 청약철회 기준을 안내합니다.'

const TERMS_DESCRIPTION =
  'Pomofi 집중 도구, 콘텐츠, AI 음성 기능의 이용 조건과 이용자의 권리·의무를 안내합니다.'

const PRIVACY_DESCRIPTION =
  'Pomofi가 처리하는 계정·세션 정보와 기기에만 저장되는 정보, 이용자의 권리를 안내합니다.'

const THIRD_PARTY_NOTICES_DESCRIPTION =
  'Pomofi가 사용하는 제3자 소프트웨어와 공개 가중치 모델의 라이선스 및 배포 조건을 안내합니다.'

const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

const PRIVATE_ROBOTS = 'noindex, nofollow'
const SOCIAL_IMAGE_URL = new URL('/icons/512.png', SEARCH_CONFIG.origin).href

const getTitle = (pathname: string) => {
  switch (normalizePathname(pathname)) {
    case '/':
      return m.app_home_title()
    case SERVICE_POLICY_PATHS.appsInToss.privacy:
      return 'Pomofi — 앱인토스 개인정보처리방침'
    case SERVICE_POLICY_PATHS.refund:
      return 'Pomofi — 환불 및 청약철회 정책'
    case SERVICE_POLICY_PATHS.appsInToss.terms:
      return 'Pomofi — 앱인토스 서비스 이용약관'
    case SERVICE_POLICY_PATHS.legacy.terms:
    case SERVICE_POLICY_PATHS.web.terms:
      return 'Pomofi — 서비스 이용약관'
    case SERVICE_POLICY_PATHS.legacy.privacy:
    case SERVICE_POLICY_PATHS.web.privacy:
      return 'Pomofi — 개인정보처리방침'
    case '/third-party-notices':
      return 'Pomofi — 제3자 라이선스 및 배포 고지'
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
      return REFUND_POLICY_DESCRIPTION
    case SERVICE_POLICY_PATHS.appsInToss.privacy:
    case SERVICE_POLICY_PATHS.legacy.privacy:
    case SERVICE_POLICY_PATHS.web.privacy:
      return PRIVACY_DESCRIPTION
    case SERVICE_POLICY_PATHS.appsInToss.terms:
    case SERVICE_POLICY_PATHS.legacy.terms:
    case SERVICE_POLICY_PATHS.web.terms:
      return TERMS_DESCRIPTION
    case '/third-party-notices':
      return THIRD_PARTY_NOTICES_DESCRIPTION
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
