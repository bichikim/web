interface PortalInteraction {
  readonly detail: {readonly originalEvent: Event}
  readonly preventDefault: () => void
}

/** Kobalte receives the shadow host as event.target; retain interactions whose composed path is internal. */
export const preventInternalDismiss = (
  event: PortalInteraction,
  surface: HTMLElement | undefined,
): void => {
  if (surface === undefined || !(surface.getRootNode() instanceof ShadowRoot)) {
    return
  }
  const path = event.detail.originalEvent.composedPath()
  if (
    path.includes(surface) ||
    path.some(
      (target) =>
        target instanceof Element &&
        target.getAttribute('aria-controls') === surface.id &&
        surface.id !== '',
    )
  ) {
    event.preventDefault()
  }
}
