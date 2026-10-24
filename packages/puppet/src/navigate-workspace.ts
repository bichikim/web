/** Changes the workspace in this tab and notifies reactive location subscribers. */
export const navigateWorkspace = (href: string): void => {
  const target = new URL(href, location.href)
  if (target.href === location.href) {
    return
  }
  history.pushState(null, '', target)
  globalThis.dispatchEvent(new PopStateEvent('popstate'))
}
