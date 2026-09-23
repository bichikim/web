export const copyToolResult = async (text: string): Promise<boolean> => {
  try {
    if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
      const {Clipboard} = await import('@apps-in-toss/web-framework')
      await Clipboard.setText(text)
    } else {
      await navigator.clipboard.writeText(text)
    }
    return true
  } catch {
    return false
  }
}
