function runWallpaperScript(callback) {
  try {
    callback()
  } catch (error) {
    console.error('Wallpaper user script failed', error)
  }
}

// Invoked by the native WebView initialization script.
// oxlint-disable-next-line no-unused-vars
function installWebsiteCode(options) {
  const {localOrigin, css, start, dom, loaded} = options
  if (
    globalThis.top !== globalThis.self ||
    !['http:', 'https:'].includes(location.protocol) ||
    location.hostname === 'tauri.localhost' ||
    location.origin === localOrigin
  ) {
    return
  }
  if (css !== '') {
    const style = document.createElement('style')
    style.id = 'wallpaper-custom-style'
    style.textContent = css
    const observer = new MutationObserver(() => {
      const root = document.documentElement
      if (root !== null && (root.lastChild !== style || style.textContent !== css)) {
        observer.disconnect()
        style.textContent = css
        root.append(style)
        observer.observe(document, {characterData: true, childList: true, subtree: true})
      }
    })
    const root = document.documentElement
    if (root !== null) {
      root.append(style)
    }
    observer.observe(document, {characterData: true, childList: true, subtree: true})
  }
  document.addEventListener('DOMContentLoaded', () => runWallpaperScript(dom), {once: true})
  globalThis.addEventListener('load', () => runWallpaperScript(loaded), {once: true})
  runWallpaperScript(start)
}
