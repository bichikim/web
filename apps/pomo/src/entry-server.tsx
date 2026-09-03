// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

import {getLocale, getTextDirection} from '@paraglide/runtime'

import {DISPLAY_THEME_BOOTSTRAP_SCRIPT} from './features/display-theme/bootstrap'

const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
const viewport = isAppsInToss
  ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
  : 'width=device-width, initial-scale=1, viewport-fit=cover'

const documentClass = isAppsInToss ? undefined : 'dark'

export default createHandler(
  (event) => (
    <StartServer
      document={(props) => (
        <html class={documentClass} dir={getTextDirection()} lang={getLocale()}>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content={viewport} />
            <script nonce={event.locals.securityNonce}>{DISPLAY_THEME_BOOTSTRAP_SCRIPT}</script>
            <link
              rel="stylesheet"
              href={import.meta.env.VITE_POMO_PRETENDARD_STYLESHEET_PATH}
              type="text/css"
            />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
