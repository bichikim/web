import {writeTextToClipboard} from 'src/utils/write-text-to-clipboard'

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    await writeTextToClipboard(text)
    return true
  } catch {
    return false
  }
}
