/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />

import type {JSX} from 'solid-js'

interface ImportMetaEnv {
  readonly POMO_ALLOW_LOCAL_ASSET_ORIGIN: string
  readonly POMO_CONNECT_SOURCES: string
  readonly POMO_CONTENT_TYPE_OPTIONS: string
  readonly POMO_LICENSE_ASSET_ORIGIN: string
  readonly POMO_PERMISSIONS_POLICY: string
  readonly POMO_REFERRER_POLICY: string
  readonly VITE_POMO_APPS_IN_TOSS_PRIVACY_PATH: string
  readonly VITE_POMO_APPS_IN_TOSS_TERMS_PATH: string
  readonly VITE_POMO_ENVIRONMENT: string
  readonly VITE_POMO_IS_APPS_IN_TOSS: string
  readonly VITE_POMO_IS_DESKTOP: string
  readonly VITE_POMO_LEGACY_PRIVACY_PATH: string
  readonly VITE_POMO_LEGACY_TERMS_PATH: string
  readonly VITE_POMO_PRETENDARD_BASE_PATH: string
  readonly VITE_POMO_PRETENDARD_STYLESHEET_PATH: string
  readonly VITE_POMO_PUBLIC_ORIGIN: string
  readonly VITE_POMO_REFUND_PATH: string
  readonly VITE_POMO_RELEASE: string
  readonly VITE_POMO_WEB_PRIVACY_PATH: string
  readonly VITE_POMO_WEB_TERMS_PATH: string
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
