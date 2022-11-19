import {RenderError} from '@quasar/app-vite'
import {ssrMiddleware} from 'quasar/wrappers'

const NOT_FOUND = 404
const INTERNAL_SERVER_ERROR = 500

// This middleware should execute as last one
// since it captures everything and tries to
// render the page with Vue

export default ssrMiddleware(({app, resolve, render, serve}) => {
  // we capture any other Express route and hand it
  // over to Vue and Vue Router to render our page
  app.get(resolve.urlPath('*'), (req, res) => {
    res.setHeader('Content-Type', 'text/html')

    render(/* the ssrContext: */ {req, res})
      .then((html) => {
        // now let's send the rendered html to the client
        res.send(html)
      })
      .catch((error: RenderError) => {
        // oops, we had an error while rendering the page

        // we were told to redirect to another URL
        if (error.url) {
          if (error.code) {
            res.redirect(error.code, error.url)
          } else {
            res.redirect(error.url)
          }
        } else if (error.code === NOT_FOUND) {
          // hmm, Vue Router could not find the requested route

          // Should reach here only if no "catch-all" route
          // is defined in /src/routes
          res.status(NOT_FOUND).send('404 | Page Not Found')
        } else if (process.env.DEV) {
          // well, we treat any other code as error;
          // if we're in dev mode, then we can use Quasar CLI
          // to display a nice error page that contains the stack
          // and other useful information

          // serve.error is available on dev only
          serve.error({err: error, req, res})
        } else {
          // we're in production, so we should have another method
          // to display something to the client when we encounter an error
          // (for security reasons, it's not ok to display the same wealth
          // of information as we do in development)

          // Render Error Page on production or
          // create a route (/src/routes) for an error page and redirect to it
          res.status(INTERNAL_SERVER_ERROR).send('500 | Internal Server Error')
          // console.error(err.stack)
        }
      })
  })
})
