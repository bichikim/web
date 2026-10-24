import {children, createEffect, createSignal, mergeProps, onCleanup} from 'solid-js'
import {useWorkspace} from './context'
import type {ViewportProps} from './types'
import {ViewportSurface} from './ViewportSurface'
export const Viewport = (props: ViewportProps) => {
  const workspace = useWorkspace()
  const overlay = children(() => props.children)
  const controls = children(() => props.controls)
  const buttons = children(() => props.viewControls)
  const configuration = mergeProps(props, {
    get children() {
      return overlay()
    },
    get controls() {
      return controls()
    },
    get viewControls() {
      return buttons()
    },
  })
  const [mount, setMount] = createSignal<HTMLDivElement>()
  createEffect(() => {
    const element = mount()
    if (element !== undefined && workspace !== undefined) {
      onCleanup(workspace.bindViewport({mount: element, props: configuration}))
    }
  })
  return (
    <>
      {workspace === undefined ? (
        <ViewportSurface {...configuration} />
      ) : (
        <div class="workspace-viewport-mount" ref={setMount} />
      )}
    </>
  )
}
