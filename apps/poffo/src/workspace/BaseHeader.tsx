import {children, createSignal, createTrackedEffect, merge} from 'solid-js'
import type {HeaderProps} from './types'
import {useWorkspace} from './context'
import {HeaderSurface} from './HeaderSurface'

export const BaseHeader = (props: HeaderProps) => {
  const workspace = useWorkspace()
  const menu = children(() => props.menu)
  const tools = children(() => props.children)
  const navigation = children(() => props.navigation)
  const extension = children(() => props.extension)
  const configuration = merge(props, {
    get children() {
      return tools()
    },
    get extension() {
      return extension()
    },
    get menu() {
      return menu()
    },
    get navigation() {
      return navigation()
    },
  })
  const [mount, setMount] = createSignal<HTMLDivElement>()
  createTrackedEffect(() => {
    const element = mount()
    if (element !== undefined && workspace !== undefined) {
      return workspace.bindHeader({
        mount: element,
        props: configuration,
      })
    }
  })
  return (
    <>
      {workspace === undefined ? (
        <HeaderSurface {...configuration} />
      ) : (
        <div class="workspace-header-mount" ref={setMount} />
      )}
    </>
  )
}
