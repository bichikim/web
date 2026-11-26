import {children, createSignal, createTrackedEffect, merge, useContext} from 'solid-js'
import {ViewportContext} from './context'
import type {ViewportProps} from './types'
import {ViewportSurface} from './ViewportSurface'
export const Viewport = (props: ViewportProps) => {
  const workspace = useContext(ViewportContext) ?? undefined
  const overlay = children(() => props.children)
  const controls = children(() => props.controls)
  const buttons = children(() => props.viewControls)
  const configuration = merge(props, {
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
  createTrackedEffect(() => {
    const element = mount()
    if (element !== undefined && workspace !== undefined) {
      return workspace.bind({mount: element, props: configuration})
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
