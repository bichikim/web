// This middleware should execute as last one
// since it captures everything and tries to
// render the page with Vue

import createEmotionServer from '@emotion/server/create-instance'
import {SsrMiddlewareCallback} from '@quasar/app'
import inject from 'node-inject-html'

const render: SsrMiddlewareCallback = ({ app, resolve, render, serve }) => {
  // we capture any other Express route and hand it
  // over to Vue and Vue Router to render our page
  app.get(resolve.urlPath('*'), (req, res) => {
    res.setHeader('Content-Type', 'text/html')

    // @ts-ignore
    req.cache = null

    render({ req, res })
      .then(appContent => {

        // has emotion js
        const cache = req?.__emotionCache__
        if (cache) {
          // inject emotion styles
          const emotionServer = createEmotionServer(cache)
          const {html, styles} = emotionServer.extractCriticalToChunks(appContent)
          const stylesInHead = emotionServer.constructStyleTagsFromChunks({html, styles})
          res.send(inject(html, {
            headEnd: stylesInHead,
          }))
          return
        }
        // now let's send the rendered html to the client
        // res.send(renderStylesToString(appContent))
        res.send(appContent)
      })
      .catch(error => {
        // oops, we had an error while rendering the page

        // we were told to redirect to another URL
        if (error.url) {
          if (error.code) {
            res.redirect(error.code, error.url)
          }
          else {
            res.redirect(error.url)
          }
        }
        // hmm, Vue Router could not find the requested route
        else if (error.code === 404) {
          // Should reach here only if no "catch-all" route
          // is defined in /src/routes
          res.status(404).send('404 | Page Not Found')
        }
        // well, we treat any other code as error;
        // if we're in dev mode, then we can use Quasar CLI
        // to display a nice error page that contains the stack
        // and other useful information
        else if (process.env.DEV) {
          // serve.error is available on dev only
          serve.error({ err: error, req, res })
        }
        // we're in production, so we should have another method
        // to display something to the client when we encounter an error
        // (for security reasons, it's not ok to display the same wealth
        // of information as we do in development)
        else {
          // Render Error Page on production or
          // create a route (/src/routes) for an error page and redirect to it
          res.status(500).send('500 | Internal Server Error')
        }
      })
  })
}

export default render
