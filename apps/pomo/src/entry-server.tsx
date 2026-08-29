// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

import {getLocale, getTextDirection} from '@paraglide/runtime'
import {PRETENDARD_FONT_ASSETS} from 'src/data/font-assets'

const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
const viewport = isAppsInToss
  ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
  : 'width=device-width, initial-scale=1, viewport-fit=cover'

const documentColorScheme = isAppsInToss ? 'light' : 'dark'
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
            <meta name="theme-color" content={documentThemeColor} />
            <link rel="stylesheet" href={PRETENDARD_FONT_ASSETS.stylesheetPath} type="text/css" />
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
