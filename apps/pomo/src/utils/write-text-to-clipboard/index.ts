/** 실행 환경의 클립보드에 쓰고 권한 오류나 어댑터 실패를 전파한다. */
export const writeTextToClipboard = async (text: string): Promise<void> => {
  if (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') {
    const {Clipboard} = await import('@apps-in-toss/web-framework')
    await Clipboard.setText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}
