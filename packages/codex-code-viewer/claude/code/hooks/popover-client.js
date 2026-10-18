/** Dismisses transient menus on an explicit press outside their placed card. */
export default function PopoverClient(_props, surface) {
  surface.onPointer((event) => {
    if (event.type === 'down') {
      surface.post({kind: 'popoverClose'})
    }
  })
  return surface.elements.Box({height: '100%', width: '100%'})
}
