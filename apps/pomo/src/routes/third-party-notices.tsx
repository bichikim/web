import * as m from '@paraglide/message'
import {createResource, ErrorBoundary, Show, Suspense} from 'solid-js'
import {loadLicenseData} from 'src/features/licenses'
import {ThirdPartyNoticesDocument} from '../components/third-party-notices/Document'

export default function ThirdPartyNoticesPage() {
  const [licenseData] = createResource(loadLicenseData)

  return (
    <ErrorBoundary fallback={<p role="alert">{m.third_party_notices_load_error()}</p>}>
      <Suspense fallback={<p role="status">{m.third_party_notices_loading()}</p>}>
        <Show keyed when={licenseData()}>
          {(data) => <ThirdPartyNoticesDocument licenseData={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
