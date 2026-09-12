// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

import {getLocale, getTextDirection} from '@paraglide/runtime'

import {InstallationMetadata} from './components/InstallationMetadata'
import {ViewportMetadata} from './components/ViewportMetadata'

import {DISPLAY_THEME_BOOTSTRAP_SCRIPT} from './features/display-theme/bootstrap'
import {pretendardFontFaceStyles} from '../scripts/unocss/pretendard'

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
            {/* Keep font faces in the document so code-split CSS assets do not duplicate them. */}
            <style nonce={event.locals.securityNonce}>{pretendardFontFaceStyles}</style>
            <link rel="icon" href="/favicon.png" type="image/png" sizes="64x64" />
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
