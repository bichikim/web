import {MayRef} from 'src/types'
import {wrapRef} from 'src/wrap-ref'
import {freeze, isSSR} from '@winter-love/utils'
import {useElementEvent} from 'src/element-event'
import {useBlur} from 'src/blur'
import {ref} from 'vue'

const isClipboardAble = () => {
  if (isSSR()) {
    return false
  }

  const {navigator} = window

  return Boolean(navigator && navigator.clipboard)
}

export type ClipboardState = 'idle' | 'reading' | 'writing'

export const useClipboard = (
  initState?: MayRef<string | undefined>,
  updateOnEvent: boolean = false,
) => {
  const valueRef = wrapRef(initState)
  const isSupported = isClipboardAble()
  const stateRef = ref<ClipboardState>('idle')

  const read = async () => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await navigator.clipboard.readText()
    valueRef.value = value
    stateRef.value = 'idle'
    return value
  }

  if (updateOnEvent && isSupported) {
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  const write = async (_value?: string) => {
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }
    const {value} = valueRef
    if (value) {
      stateRef.value = 'writing'
      await navigator.clipboard.writeText(_value ?? value)

      stateRef.value = 'idle'
      read()
    }
  }

  read()

  return freeze({
    isSupported,
    read,
    state: stateRef,
    value: valueRef,
    write,
  })
}

let _legacyInput: HTMLInputElement

const getLegacyInput = (): HTMLInputElement | undefined => {
  if (_legacyInput) {
    return _legacyInput
  }
  if (isSSR()) {
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
  const input = getLegacyInput()
  if (!input) {
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
) => {
  const isSupported = isClipboardAble()
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
    if (!isSupported || stateRef.value !== 'idle') {
      return valueRef.value
    }

    stateRef.value = 'reading'
    const value = await navigator.clipboard.readText()
    valueRef.value = value
    stateRef.value = 'idle'
    return value
  }

  if (isSupported) {
    useElementEvent(window, 'copy' as any, read)
    useElementEvent(window, 'cut' as any, read)
  }

  return {
    read,
    value: valueRef,
    write,
  }
}
