import {} from 'vue'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'

export interface UseClipboardOptions {
  copyKey?: string
  pasteKey?: string
  // empty
}

export const useClipboard = (
  initState?: MayRef<string | undefined>,
  options?: MayRef<UseClipboardOptions | undefined>,
) => {
  const valueRef = wrapRef(initState)
  // const {copyKey, pasteKey} = options

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const copy = () => {
    // empty
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const paste = () => {
    // empty
  }

  return {
    copy,
    paste,
  }
}
