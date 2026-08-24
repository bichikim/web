import {Link, Meta, Title} from '@solidjs/meta'
import {useLocation} from '@solidjs/router'
import {
  getCanonicalPathname,
  isSearchIndexablePath,
  normalizePathname,
} from '../components/pomo-route'
import {SEARCH_CONFIG} from '../config/search'
import {SERVICE_POLICY_PATHS} from '../config/service-policy'
import * as m from '../paraglide/messages.js'

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

const getTitle = (pathname: string) => {
  switch (normalizePathname(pathname)) {
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
    default:
      return m.app_default_description()
  }
}

export const PDocumentMetadata = () => {
  const location = useLocation()
  const canonicalUrl = () =>
    new URL(getCanonicalPathname(location.pathname), SEARCH_CONFIG.origin).href

  return (
    <>
      <Title>{getTitle(location.pathname)}</Title>
      <Meta content={getDescription(location.pathname)} name="description" />
      <Meta
        content={isSearchIndexablePath(location.pathname) ? INDEXABLE_ROBOTS : PRIVATE_ROBOTS}
        name="robots"
      />
      <Link href={canonicalUrl()} rel="canonical" />
      <Link href="/llms.txt" rel="describedby" type="text/markdown" />
    </>
  )
}
