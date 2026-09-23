import {createEffect, createResource, ErrorBoundary, Show, Suspense} from 'solid-js'
import * as m from '@paraglide/message'
import {loadVersionCatalog, writeViewedRelease} from 'src/features/version-catalog'
import {VersionCatalogDocument} from '../components/whats-new/Document'

export default function WhatsNewPage() {
  const [catalog] = createResource(loadVersionCatalog)

  createEffect(() => {
    if (catalog.state !== 'ready') {
      return
    }

    const loadedCatalog = catalog.latest
    if (loadedCatalog === undefined) {
      return
    }

    const [newestRelease] = loadedCatalog.releases.toSorted(
      (left, right) => Date.parse(right.releasedAt) - Date.parse(left.releasedAt),
    )
    if (newestRelease === undefined) {
      return
    }

    writeViewedRelease({
      formatVersion: 1,
      releasedAt: newestRelease.releasedAt,
      version: newestRelease.version,
    }).catch((error: unknown) => console.error('Failed to persist viewed version release.', error))
  })

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
