import {createHandler, StartServer} from '@solidjs/start/server'

export default createHandler(() => (
  <StartServer
    document={(props) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
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
