import type {JSX} from 'solid-js'

import {usePanelLayout} from '../use-panel-layout'
import {EditorPanelResizer} from './EditorPanelResizer'

export interface EditorPanelVisibility {
  readonly bottomOpen: boolean
  readonly leftOpen: boolean
  readonly onBottomToggle: () => void
  readonly onLeftToggle: () => void
  readonly onRightToggle: () => void
  readonly rightOpen: boolean
}

export interface EditorPanelLayoutProps {
  readonly bottom?: JSX.Element
  readonly inspector?: JSX.Element
  readonly layers?: JSX.Element
  readonly toolbar?: (visibility: EditorPanelVisibility) => JSX.Element
  readonly viewport?: JSX.Element
}

export const EditorPanelLayout = (props: EditorPanelLayoutProps) => {
  const layout = usePanelLayout()
  const visibility: EditorPanelVisibility = {
    get bottomOpen() {
      return layout.bottomOpen()
    },
    get leftOpen() {
      return layout.leftOpen()
    },
    onBottomToggle: () => layout.setBottomOpen(!layout.bottomOpen()),
    onLeftToggle: () => layout.setLeftOpen(!layout.leftOpen()),
    onRightToggle: () => layout.setRightOpen(!layout.rightOpen()),
    get rightOpen() {
      return layout.rightOpen()
    },
  }

  return (
    <main
      class="puppet-editor"
      classList={{
        'bottom-panel-closed': !layout.bottomOpen(),
        'left-panel-closed': !layout.leftOpen(),
        'right-panel-closed': !layout.rightOpen(),
      }}
      style={{
        '--bottom-panel-size': `${layout.bottomSize()}px`,
        '--left-panel-size': `${layout.leftSize()}px`,
        '--right-panel-size': `${layout.rightSize()}px`,
      }}
    >
      {props.toolbar?.(visibility)}
      {props.layers}
      <EditorPanelResizer
        dragging={layout.resizingPosition() === 'left'}
        position="left"
        size={layout.leftSize()}
        onResizeBy={(delta) => layout.resizeBy('left', delta)}
        onResizeStart={(event) => layout.startResize('left', event)}
      />
      {props.viewport}
      <EditorPanelResizer
        dragging={layout.resizingPosition() === 'right'}
        position="right"
        size={layout.rightSize()}
        onResizeBy={(delta) => layout.resizeBy('right', delta)}
        onResizeStart={(event) => layout.startResize('right', event)}
      />
      {props.inspector}
      <EditorPanelResizer
        dragging={layout.resizingPosition() === 'bottom'}
        position="bottom"
        size={layout.bottomSize()}
        onResizeBy={(delta) => layout.resizeBy('bottom', delta)}
        onResizeStart={(event) => layout.startResize('bottom', event)}
      />
      {props.bottom}
    </main>
  )
}
