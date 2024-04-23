import {ref} from 'vue'
import {onEvent} from '@winter-love/use'
import {getWindow} from '@winter-love/utils'

const hasKey = (event: KeyboardEvent, key: string) => {
  return [event.key, event.code].includes(key)
}

export const onKeyboard = (
  key: string,
  callback: (isDown: boolean) => unknown,
  downRepeat: boolean = false,
) => {
  const keyDown = ref(false)
  onEvent(getWindow(), 'keydown', (event) => {
    if (hasKey(event, key) && (keyDown.value === false || downRepeat)) {
      callback(true)
      keyDown.value = true
    }
  })

  onEvent(getWindow(), 'keyup', (event) => {
    if (hasKey(event, key)) {
      callback(false)
      keyDown.value = false
    }
  })
}
