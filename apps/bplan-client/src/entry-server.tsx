// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

export default createHandler(() => (
  <StartServer
    document={({assets, children, scripts}) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="icon" href="/favicon.ico" />
          <title>Coong</title>
          {assets}
        </head>
        <body class="overflow-hidden m-0 h-100vh relative">
          {children}
          {scripts}
        </body>
      </html>
    )}
  />
))
