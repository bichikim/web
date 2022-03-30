import {getDocument, getNavigator, getWindow} from '@winter-love/utils'
import {useBlur} from 'src/blur'
import {ClipboardState} from 'src/clipboard/index'
import {useElementEvent} from 'src/element-event'
import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {ref} from 'vue-demi'

// todo fix this
// eslint-disable-next-line functional/no-let
let _legacyInput: HTMLInputElement

const getLegacyInput = (): HTMLInputElement | undefined => {
  if (_legacyInput) {
    return _legacyInput
  }

  const document = getDocument()

  if (!document) {
    return
  }

  const _inputElement = document.querySelector('#__legacy_input__')

  if (_inputElement) {
    _legacyInput = _inputElement as HTMLInputElement
    return _legacyInput
  }

  const inputElement = document.createElement('input')
  inputElement.id = '__legacy_input__'
  inputElement.style.display = 'block'
  inputElement.setAttribute('type', 'text')
  document.body.append(inputElement)
  _legacyInput = inputElement
  return inputElement
}

const blur = useBlur()

const legacyCopy = (value: string) => {
  const document = getDocument()
  const input = getLegacyInput()
  if (!input || !document) {
    return
  }

  input.style.display = 'block'
  input.value = value
  input.select()
  const result = document.execCommand('copy')
  if (!result) {
    return result
  }
  blur()
  input.style.display = 'none'
  return result
}

export const useLegacyClipboard = (
  initState?: MayRef<string | undefined>,
  updateOnEvent: boolean = false,
) => {
  const window = getWindow()
  const navigator = getNavigator()
  const clipboard = navigator?.clipboard
  const valueRef = wrapRef(initState)
  const stateRef = ref<ClipboardState>('idle')

  const write = (value: string) => {
    stateRef.value = 'writing'
    const result = legacyCopy(value ?? valueRef.value)
    if (!result) {
      return Promise.reject(new Error('Cannot copy string (legacy)'))
    }
    if (value) {
      valueRef.value = value
    }
    stateRef.value = 'idle'
    return Promise.resolve(valueRef.value)
  }

  const read = async () => {
    if (!clipboard || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await clipboard.readText()
    valueRef.value = value
    stateRef.value = 'idle'
    return value
  }

  if (updateOnEvent && clipboard && window) {
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  return {
    read,
    value: valueRef,
    write,
  }
}
