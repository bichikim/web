import {type Component, Show} from 'solid-js'

import {type Locale, locales} from '../../paraglide/runtime.js'
import NotFoundPage from '../../routes/[...404].tsx'

interface LocalizedRouteProps {
  readonly params: {
    readonly locale?: string
  }
}

const isLocale = (value: string | undefined): value is Locale =>
  value !== undefined && locales.includes(value as Locale)

/** Creates a locale-prefixed alias for an existing canonical page route. */
export const createLocalizedRoute = (Page: Component): Component<LocalizedRouteProps> =>
  function LocalizedRoute(props) {
    return (
      <Show fallback={<NotFoundPage />} when={isLocale(props.params.locale)}>
        <Page />
      </Show>
    )
  }
