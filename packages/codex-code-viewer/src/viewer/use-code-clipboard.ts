interface CodeClipboardOptions {
  onError: (error: unknown) => void
  onNotice: (message: string) => void
}

export const useCodeClipboard =
  (options: CodeClipboardOptions) =>
  async (text: string, successMessage = '코드를 복사했습니다.'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      options.onNotice(successMessage)
    } catch (error) {
      options.onError(error)
    }
  }
