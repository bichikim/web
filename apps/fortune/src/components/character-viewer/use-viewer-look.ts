import {type Accessor, createSignal} from 'solid-js'
import type {LookTarget} from '@winter-love/puppet/player'
import {getViewportLook} from './get-viewport-look'

interface UseViewerLookProps {
  readonly viewport: Accessor<HTMLDivElement | null>
  readonly onLook: (target: LookTarget) => void
}

export const useViewerLook = (props: UseViewerLookProps) => {
  const [fixedTarget, setFixedTarget] = createSignal<LookTarget | null>(null)
  let currentTarget: LookTarget = {x: 0, y: 0}
  const following = () => fixedTarget() === null

  const applyLook = (target: LookTarget) => {
    currentTarget = target
    props.onLook(target)
  }

  const turnHead = (x: -1 | 0 | 1) => {
    const target = {x, y: 0}
    setFixedTarget(target)
    applyLook(target)
  }

  const toggleFollowing = () => setFixedTarget(following() ? currentTarget : null)

  const clearLook = () => {
    if (following()) {
      applyLook({x: 0, y: 0})
    }
  }

  const handleLook = (event: PointerEvent) => {
    const viewport = props.viewport()
    if (following() && event.pointerType !== 'touch' && viewport !== null) {
      applyLook(getViewportLook({bounds: viewport.getBoundingClientRect(), pointer: event}))
    }
  }

  const direction = () => {
    const target = fixedTarget()
    return target?.y === 0 ? target.x : null
  }

  return {clearLook, direction, following, handleLook, toggleFollowing, turnHead}
}
