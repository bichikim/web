/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />

import type {JSX} from 'solid-js'

interface ImportMetaEnv {
  readonly POMO_ENVIRONMENT: string
  readonly POMO_HAS_APPS_IN_TOSS_DEVTOOLS: boolean
  readonly POMO_IS_APPS_IN_TOSS: boolean
  readonly POMO_PUBLIC_ORIGIN: string
  readonly POMO_RELEASE: string
}

declare namespace App {
  interface RequestEventLocals {
    securityNonce: string
  }
}

type MediaChromeAttributes = JSX.HTMLAttributes<HTMLElement> & {
  readonly audio?: string
  readonly disabled?: boolean
  readonly notooltip?: boolean
  readonly showduration?: string
}

declare module 'solid-js' {
  namespace JSX {
    interface ExplicitBoolAttributes {
      disabled: boolean
    }

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
