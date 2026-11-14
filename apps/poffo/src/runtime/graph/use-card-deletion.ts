import {batch, createSignal} from 'solid-js'
import type {RuntimeControls} from '../use-runtime-controls'
import {deleteGraphCard} from './delete-graph-card'
interface UseCardDeletionProps {
  readonly controls: RuntimeControls
  readonly pinParameters: (ids: ReadonlyArray<string>) => void
}
export const useCardDeletion = (props: UseCardDeletionProps) => {
  const [hiddenIds, setHiddenIds] = createSignal<ReadonlyArray<string>>([])
  const removeCard = (id: string) => {
    const profile = props.controls.profile()
    if (profile === undefined) {
      return
    }
    const result = deleteGraphCard({id, profile})
    batch(() => {
      props.pinParameters(result.keepParameters)
      setHiddenIds((previous) => [...new Set([...previous, id])])
      props.controls.updateProfile(result.profile)
    })
  }
  return {
    hiddenIds,
    removeCard,
    restoreHiddenIds: (ids: readonly string[]) => setHiddenIds(ids),
    revealCard: (id: string) =>
      setHiddenIds((previous) => previous.filter((candidate) => candidate !== id)),
  }
}
