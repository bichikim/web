import type {HeaderProps} from './types'
import {RenderingSettings} from './RenderingSettings'
export const HeaderSurface = (props: HeaderProps) => (
  <header class={props.owner === 'editor' ? 'toolbar' : 'puppet-viewer-toolbar'}>
    <div class="toolbar-identity">
      {props.menu}
      {props.navigation}
      <RenderingSettings />
    </div>
    {props.extension}
    <div class={props.owner === 'editor' ? 'toolbar-actions' : 'workspace-runtime-actions'}>
      {props.children}
    </div>
  </header>
)
