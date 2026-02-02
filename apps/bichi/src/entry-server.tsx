// @refresh reload
// noinspection HtmlRequiredTitleElement

import {createHandler, StartServer} from '@solidjs/start/server'

export default createHandler(() => (
  <StartServer
    document={({assets, children, scripts}) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <meta name="description" content="Your instruments for free" />
          <link rel="mask-icon" href="/favicon.svg" color="#00aba9" />
          <link rel="manifest" href="/manifest.json" />
          {assets}
        </head>
        <body
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #f1f5f9 0%, #e0e7ff 100%)',
          }}
        >
          <div id="root">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
))
