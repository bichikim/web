interface RetainInputFocusOptions {
  readonly element: HTMLElement
  readonly operation: () => void | Promise<void>
}

/** Restores focus lost during an operation without replacing a later focus choice. */
export const retainInputFocus = async (options: RetainInputFocusOptions): Promise<void> => {
  const document = options.element.ownerDocument
  const focused = document.activeElement === options.element
  try {
    await options.operation()
  } finally {
    if (focused && options.element.isConnected && document.activeElement === document.body) {
      options.element.focus()
    }
  }
}
