import * as m from '@paraglide/message'
import {createSignal, untrack} from 'solid-js'

import {synchronizeDesktopBackground} from 'src/features/desktop-mode'
import {type BackgroundController, backgroundWebsiteUrlSchema} from 'src/features/background'
import {PTextField} from '../../p-text-field/PTextField'
import {PSettingsActionButton} from '../ActionButton'

export interface WebsiteProps {
  readonly background: BackgroundController
}

export const Website = (props: WebsiteProps) => {
  const [url, setUrl] = createSignal(untrack(() => props.background.preferences().websiteUrl ?? ''))
  const [hasUrlError, setHasUrlError] = createSignal(false)

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const result = backgroundWebsiteUrlSchema.safeParse(url().trim())
    if (!result.success) {
      setHasUrlError(true)
      return
    }

    setHasUrlError(false)
    props.background
      .configure({mode: 'website', websiteUrl: result.data})
      .then(() => synchronizeDesktopBackground())
      .catch(() => undefined)
  }

  return (
    <div class="grid gap-5">
      <p class="m-0 text-sm leading-6 text-muted-foreground">
        {m.background_website_description()}
      </p>
      <form class="grid gap-4" onSubmit={handleSubmit}>
        <PTextField
          description={m.background_website_hint()}
          errorMessage={hasUrlError() ? m.background_website_url_error() : undefined}
          label={m.background_website_label()}
          onChange={(value) => {
            setUrl(value)
            setHasUrlError(false)
          }}
          placeholder="https://example.com"
          required
          type="url"
          value={url()}
        />
        <PSettingsActionButton
          disabled={props.background.busy() || !props.background.ready()}
          type="submit"
        >
          {m.background_website_apply()}
        </PSettingsActionButton>
      </form>
    </div>
  )
}
