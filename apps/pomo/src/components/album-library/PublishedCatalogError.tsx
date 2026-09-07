import {createEffect} from 'solid-js'
import {PButton} from '../PButton'
import {reportClientError} from '../../features/client-error-reporter'
import * as m from '@paraglide/message'

interface PublishedCatalogErrorProps {
  readonly error: Error
  readonly isRetrying: boolean
  readonly onRetry: () => void
}

export const PublishedCatalogError = (props: PublishedCatalogErrorProps) => {
  createEffect(() => {
    reportClientError(props.error, {feature: 'album-library', source: 'direct'})
  })

  return (
    <div
      class="mb-3 rounded-control border border-solid border-danger/45 bg-danger/10 px-3 py-3
        text-danger"
      role="alert"
    >
      <p class="m-0 text-sm font-650">{m.album_catalog_load_failed()}</p>
      <PButton
        bordered
        transparent
        class="mt-2"
        disabled={props.isRetrying}
        onPress={props.onRetry}
        size="small"
        tone="secondary"
      >
        {m.album_retry()}
      </PButton>
    </div>
  )
}
