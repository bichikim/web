interface CodeClipboardOptions {
  onError: (error: unknown) => void
  onNotice: (message: string) => void
}

export const useCodeClipboard =
  (options: CodeClipboardOptions) =>
  async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      options.onNotice('코드를 복사했습니다.')
    } catch (error) {
      options.onError(error)
    }
  }
