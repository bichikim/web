interface UseCodeClipboardProps {
  onError: (error: unknown) => void
  onNotice: (message: string) => void
}

export const useCodeClipboard =
  (props: UseCodeClipboardProps) =>
  async (text: string, successMessage = '코드를 복사했습니다.'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      props.onNotice(successMessage)
    } catch (error) {
      props.onError(error)
    }
  }
