/* eslint-disable no-undef */
/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.conf > pwa > workboxPluginMode is set to "InjectManifest"
 */

const httpCashList = [
  /^http/,
  // [/^https?:\/\/maps.googleapis.com\/maps\/vt\??/, false],
]

self.addEventListener('message', (event) => {
  const replyPort = event.ports[0]
  const message = event.data
  if (replyPort && message && message.type === 'SKIP_WAITING') {
    event.waitUntil(
      self.skipWaiting().then(
        () => replyPort.postMessage({error: null}),
        (error) => replyPort.postMessage({error}),
      ),
    )
  }
})

workbox.setConfig({debug: false})

workbox.core.clientsClaim()

workbox.core.setCacheNameDetails({prefix: 'winter-love'})

workbox.routing.registerRoute(({url}) => {
  return httpCashList.some((reg) => {
    if (Array.isArray(reg)) {
      const [_reg, bool = true] = reg
      return _reg.test(url) ? bool : !bool
    }
    return reg.test(url)
  })
}, new workbox.strategies.NetworkFirst(), 'GET')

self.__precacheManifest = [].concat(self.__precacheManifest || [])

workbox.precaching.precacheAndRoute(self.__precacheManifest, {})
