// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

// noinspection HtmlRequiredTitleElement
export default createHandler(() => (
  <StartServer
    document={({assets, children, scripts}) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="mobile-web-app-capable" content="yes" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <meta name="description" content="Your instruments for free" />
          <meta name="theme-color" content="#eee" />
          <link rel="mask-icon" href="/favicon.svg" color="#00aba9" />
          <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
          <link
            rel="stylesheet"
            as="style"
            crossorigin=""
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="mask-icon" href="/favicon.svg" color="#00aba9" />
          <link rel="manifest" href="/manifest.json" />
          <style type="text/css">
            {`
              body {
                position: relative;
                overflow: hidden;
                margin: 0;
                height:100;
                height: 100dvh;
                height: --webkit-fill-available;
                font-family: "Pretendard Variable", sans-serif;
              }
              button {
                font-family: inherit;
              }
            `}
          </style>
          {assets}
        </head>
        <body>
          {children}
          {scripts}
        </body>
      </html>
    )}
  />
))
