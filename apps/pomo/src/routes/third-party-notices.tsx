import {createResource, ErrorBoundary, Show, Suspense} from 'solid-js'
import {loadLicenseData} from 'src/features/licenses'
import {ThirdPartyNoticesDocument} from '../components/third-party-notices/Document'

export default function ThirdPartyNoticesPage() {
  const [licenseData] = createResource(loadLicenseData)

  return (
    <ErrorBoundary fallback={<p role="alert">라이선스 정보를 불러오지 못했습니다.</p>}>
      <Suspense fallback={<p role="status">라이선스 정보를 불러오는 중…</p>}>
        <Show keyed when={licenseData()}>
          {(data) => <ThirdPartyNoticesDocument licenseData={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
