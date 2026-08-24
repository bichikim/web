// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'
import {Show} from 'solid-js'

import {LOCALIZED_STATIC_ROUTES} from './config/static-localization.ts'
import {
  cookieName,
  getLocale,
  getTextDirection,
  locales,
  localStorageKey,
} from './paraglide/runtime.js'

const viewport =
  process.env.POMO_BUILD_TARGET === 'apps-in-toss'
    ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    : 'width=device-width, initial-scale=1, viewport-fit=cover'

const documentColorScheme = process.env.POMO_BUILD_TARGET === 'apps-in-toss' ? 'light' : 'dark'
const documentThemeColor = documentColorScheme === 'light' ? '#f7f8fa' : '#17130f'
const documentForeground = documentColorScheme === 'light' ? '#191f28' : '#fff9f1'

const CRITICAL_LAYOUT_CSS = `
html,
body,
#root {
  min-height: 100%;
  width: 100%;
}

body {
  margin: 0;
  min-height: 100dvh;
}

.pomo-home,
.pomo-studio {
  position: relative;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.pomo-home-stage,
.pomo-scene {
  position: relative;
  height: 100%;
  width: 100%;
}

.pomo-home {
  background: ${documentThemeColor};
}

.pomo-scene {
  margin: 0;
  overflow: hidden;
  background: ${documentThemeColor};
}

.pomo-scene-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  height: 100%;
  width: 100%;
  color: ${documentForeground};
}
`

export default createHandler(
  (event) => (
    <StartServer
      document={(props) => (
        <html data-color-scheme={documentColorScheme} dir={getTextDirection()} lang={getLocale()}>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content={viewport} />
            <Show when={import.meta.env.POMO_IS_APPS_IN_TOSS}>
              <script
                data-cookie-name={cookieName}
                data-locales={locales.join(',')}
                data-localized-routes={LOCALIZED_STATIC_ROUTES.join(',')}
                data-storage-key={localStorageKey}
                src="/localization/redirect.js"
              />
            </Show>
            <meta name="theme-color" content={documentThemeColor} />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            <style nonce={event.locals.securityNonce}>{CRITICAL_LAYOUT_CSS}</style>
            {props.assets}
          </head>
          <body>
            <div id="root">{props.children}</div>
            {props.scripts}
          </body>
        </html>
      )}
    />
  ),
  (event) => ({nonce: event.locals.securityNonce}),
)
