// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'

const viewport =
  process.env.POMO_BUILD_TARGET === 'apps-in-toss'
    ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    : 'width=device-width, initial-scale=1, viewport-fit=cover'

export default createHandler(() => (
  <StartServer
    document={(props) => (
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content={viewport} />
          <meta
            name="description"
            content="3D 캐릭터, 뽀모도로 타이머와 음악이 함께하는 집중 공간"
          />
          <meta name="theme-color" content="#17131f" />
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
