import {useGlobalTouch, DownState} from 'src/components/real-button/use-global-touch'
import {createMemo, Accessor} from 'solid-js'

export const useDragAble = (id: string): Accessor<DownState> => {
  const isDown = useGlobalTouch(id)

  return createMemo(() => {
    const {down, point} = isDown()
    return {
      down,
      point,
    }
  })
}
