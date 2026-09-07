import {createResource, ErrorBoundary, Show, Suspense} from 'solid-js'
import * as m from '@paraglide/message'
import {loadVersionCatalog} from 'src/features/version-catalog'
import {VersionCatalogDocument} from '../components/whats-new/Document'

export default function WhatsNewPage() {
  const [catalog] = createResource(loadVersionCatalog)

  return (
    <ErrorBoundary fallback={<p role="alert">{m.version_catalog_load_error()}</p>}>
      <Suspense fallback={<p role="status">{m.version_catalog_loading()}</p>}>
        <Show keyed when={catalog()}>
          {(data) => <VersionCatalogDocument catalog={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
