// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

import {getLocale, getTextDirection} from '@paraglide/runtime'

import {InstallationMetadata} from './components/InstallationMetadata'
import {ViewportMetadata} from './components/ViewportMetadata'

import {DISPLAY_THEME_BOOTSTRAP_SCRIPT} from './features/display-theme/bootstrap'

const isAppsInToss = import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'
const documentClass = isAppsInToss ? undefined : 'dark'

export default createHandler(
  (event) => (
    <StartServer
      document={(props) => (
        <html class={documentClass} dir={getTextDirection()} lang={getLocale()}>
          <head>
            <meta charset="utf-8" />
            <ViewportMetadata />
            <script nonce={event.locals.securityNonce}>{DISPLAY_THEME_BOOTSTRAP_SCRIPT}</script>
            <link
              rel="stylesheet"
              href={import.meta.env.VITE_POMO_PRETENDARD_STYLESHEET_PATH}
              type="text/css"
            />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            <InstallationMetadata />
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
