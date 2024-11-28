// @refresh reload
import {createHandler, StartServer} from '@solidjs/start/server'
const appStyle = `
body {
  position: relative;
  overflow: hidden;
  margin: 0;
  height: 100vh;
}
* {
  /* disable additional non-standard gestures such as double-tap to zoom */
  touch-action: manipulation;
}
#app {
  position: absolute;
  overflow: hidden;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
#app::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-color: #e5e5f7;
  opacity: 0.3;
  background-image:  repeating-radial-gradient( circle at 0 0, transparent 0, #e5e5f7 6px ),
                     repeating-linear-gradient( #9495a555, #9495a5 );
}
`
export default createHandler(() => (
  <StartServer
    document={({assets, children, scripts}) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="icon" href="/favicon.ico" />
          <style type="text/css">{appStyle}</style>
          <title>bplan</title>
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
))
