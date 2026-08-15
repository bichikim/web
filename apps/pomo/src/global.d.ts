/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />

import type {JSX} from 'solid-js'

type MediaChromeAttributes = JSX.HTMLAttributes<HTMLElement> & {
  readonly audio?: string
  readonly disabled?: boolean
  readonly notooltip?: boolean
  readonly showduration?: string
}

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'media-control-bar': MediaChromeAttributes
      'media-controller': MediaChromeAttributes
      'media-mute-button': MediaChromeAttributes
      'media-play-button': MediaChromeAttributes
      'media-time-display': MediaChromeAttributes
      'media-time-range': MediaChromeAttributes
      'media-volume-range': MediaChromeAttributes
    }
  }
}
