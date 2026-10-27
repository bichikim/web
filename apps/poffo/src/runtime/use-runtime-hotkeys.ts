import {useWorkspace} from '../workspace/context'
import {type Accessor, onCleanup} from 'solid-js'
import type {RuntimeProfile} from '../tracking/types'
interface UseRuntimeHotkeysProps {
  readonly profile: Accessor<RuntimeProfile | undefined>
  readonly onExpression: (id: string) => void
  readonly onMotion: (id: string) => void
}
export const useRuntimeHotkeys = (props: UseRuntimeHotkeysProps) => {
  const workspace = useWorkspace()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      (workspace !== undefined && (!workspace.active() || workspace.mode() === 'editor')) ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event
        .composedPath()
        .some(
          (target) =>
            target instanceof HTMLElement &&
            (target.isContentEditable || target.matches('input,textarea,select')),
        )
    ) {
      return
    }
    const current = props.profile()
    const key = event.key.toLowerCase()
    const expression = current?.expressions.find(
      (preset) => preset.key !== '' && preset.key.toLowerCase() === key,
    )
    const motion = current?.motions.find(
      (shortcut) => shortcut.key !== '' && shortcut.key.toLowerCase() === key,
    )
    if (expression !== undefined) {
      event.preventDefault()
      props.onExpression(expression.id)
    } else if (motion !== undefined) {
      event.preventDefault()
      props.onMotion(motion.motionId)
    }
  }
  globalThis.addEventListener('keydown', handleKeyDown)
  onCleanup(() => globalThis.removeEventListener('keydown', handleKeyDown))
}
