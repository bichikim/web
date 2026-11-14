import type {HeaderProps} from './types'
export const HeaderSurface = (props: HeaderProps) => (
  <header class={props.owner === 'editor' ? 'toolbar' : 'puppet-viewer-toolbar'}>
    <div class="toolbar-identity">
      {props.menu}
      {props.navigation}
    </div>
    {props.extension}
    <div class={props.owner === 'editor' ? 'toolbar-actions' : 'workspace-runtime-actions'}>
      {props.children}
    </div>
  </header>
)
