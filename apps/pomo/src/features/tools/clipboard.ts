import {isFulfilled} from 'src/utils/is-fulfilled'
import {writeTextToClipboard} from 'src/utils/write-text-to-clipboard'

export const copyToolResult = (text: string): Promise<boolean> =>
  isFulfilled(writeTextToClipboard(text))
