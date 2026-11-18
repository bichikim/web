export const isolateMeshHistory = (event: KeyboardEvent) => {
  if (event.altKey || (!event.ctrlKey && !event.metaKey)) {
    return
  }
  const key = event.key.toLowerCase()
  if (key === 'z' || (key === 'y' && event.ctrlKey)) {
    event.stopPropagation()
    const editableTarget = event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLInputElement &&
              (target.type === 'text' || target.type === 'number'))),
      )
    if (!editableTarget) {
      event.preventDefault()
    }
  }
}
