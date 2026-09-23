import * as m from '@paraglide/message'

export interface WebsiteBackgroundProps {
  readonly url: string
}

/** Renders a saved website inside the desktop app's normal scene surface. */
export const WebsiteBackground = (props: WebsiteBackgroundProps) => (
  <iframe
    class="block h-full w-full border-0"
    loading="eager"
    referrerPolicy="no-referrer"
    src={props.url}
    title={m.background_website_label()}
  />
)
