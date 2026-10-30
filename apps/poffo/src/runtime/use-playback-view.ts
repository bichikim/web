import type {RuntimeView} from '../tracking/types'
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import {
  attachViewNavigation,
  attachViewPan,
  MAXIMUM_VIEW_ZOOM,
  MINIMUM_VIEW_ZOOM,
  useElementSize,
  type ViewCamera,
} from '@winter-love/puppet/editor'

interface UsePlaybackViewProps {
  readonly saved?: Accessor<RuntimeView | undefined>
  readonly onChange?: (view: RuntimeView) => void
  readonly element: Accessor<HTMLElement | null>
  readonly width: Accessor<number>
  readonly height: Accessor<number>
}
const VIEWPORT_PADDING = 0.05
export const usePlaybackView = (props: UsePlaybackViewProps) => {
  const initial = untrack(() => props.saved?.())
  const [camera, setCamera] = createSignal<ViewCamera>(initial?.camera ?? {x: 0, y: 0, zoom: 1})
  const [fitted, setFitted] = createSignal(initial?.fitted ?? true)
  const [panning, setPanning] = createSignal(false)
  const size = useElementSize(props.element)
  const navigate = (camera: ViewCamera) => {
    batch(() => {
      setFitted(false)
      setCamera(camera)
      props.onChange?.({camera, fitted: false})
    })
  }
  const fit = () => {
    const measured = size()
    const width = props.width()
    const height = props.height()
    if (measured.width <= 0 || measured.height <= 0) {
      return
    }
    const zoom = Math.max(
      MINIMUM_VIEW_ZOOM,
      Math.min(
        MAXIMUM_VIEW_ZOOM,
        measured.width / (width * (1 + 2 * VIEWPORT_PADDING)),
        measured.height / (height * (1 + 2 * VIEWPORT_PADDING)),
      ),
    )
    const next = {
      x: (width - measured.width / zoom) / 2,
      y: (height - measured.height / zoom) / 2,
      zoom,
    }
    batch(() => {
      setFitted(true)
      setCamera(next)
      props.onChange?.({camera: next, fitted: true})
    })
  }
  const saved = createMemo(() => props.saved?.())
  createEffect(
    on(saved, (view) => {
      if (view !== undefined) {
        batch(() => {
          setCamera(view.camera)
          setFitted(view.fitted)
        })
      }
    }),
  )
  createEffect(() => {
    size()
    if (fitted()) {
      untrack(fit)
    }
  })
  createEffect(() => {
    const element = props.element()
    if (element !== null) {
      onCleanup(attachViewNavigation({camera, element, onChange: navigate}))
      onCleanup(attachViewPan({camera, element, onChange: navigate, onPanningChange: setPanning}))
    }
  })
  return {camera, fit, navigate, panning}
}
