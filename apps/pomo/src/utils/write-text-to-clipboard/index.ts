/** Writes to the runtime clipboard and propagates permission or adapter failures. */
export const writeTextToClipboard = async (text: string): Promise<void> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
    const {Clipboard} = await import('@apps-in-toss/web-framework')
    await Clipboard.setText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}
