// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

export default createHandler(() => (
  <StartServer
    document={(props) => (
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#faf8f4" />
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
))
