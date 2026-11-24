export type WorkspaceNavigationGuard = (target: URL) => boolean
const guards = new Set<WorkspaceNavigationGuard>()

/** Registers a retained model's navigation policy until its host is disposed. */
export const registerWorkspaceNavigationGuard = (guard: WorkspaceNavigationGuard): (() => void) => {
  guards.add(guard)
  return () => {
    guards.delete(guard)
  }
}

/** Changes this tab only after every active model host accepts navigation. */
export const navigateWorkspace = (href: string): boolean => {
  const target = new URL(href, location.href)
  if (target.href === location.href || ![...guards].every((guard) => guard(target))) {
    return false
  }
  history.pushState(null, '', target)
  globalThis.dispatchEvent(new PopStateEvent('popstate'))
  return true
}
