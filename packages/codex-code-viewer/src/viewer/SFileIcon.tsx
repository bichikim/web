import {createMemo, Match, Switch} from 'solid-js'
import {fileFormat} from '../shared/file-formats'

interface SFileIconProps {
  path: string
}
export const SFileIcon = (props: SFileIconProps) => {
  const extension = createMemo(() => props.path.split('.').at(-1)?.toLowerCase() ?? '')
  return (
    <span aria-hidden="true" class="flex h-4 w-4 shrink-0 items-center justify-center">
      <Switch fallback={<span class="i-tabler-file h-4 w-4 text-muted" />}>
        <Match when={['tsx', 'jsx'].includes(extension())}>
          <span class="i-tabler-brand-react h-4 w-4 text-cyan-600" />
        </Match>
        <Match when={['ts', 'mts', 'cts'].includes(extension())}>
          <span class="rounded-[3px] bg-blue-100 p-[1px] font-sans text-[9px] font-medium leading-3 text-blue-600">
            TS
          </span>
        </Match>
        <Match when={['js', 'mjs', 'cjs'].includes(extension())}>
          <span class="rounded-[3px] bg-yellow-100 p-[1px] font-sans text-[9px] font-medium leading-3 text-yellow-800">
            JS
          </span>
        </Match>
        <Match when={extension() === 'json'}>
          <span class="font-mono text-xs text-muted">{'{}'}</span>
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'markdown'}>
          <span class="text-xs font-semibold text-green-600">M↓</span>
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'table'}>
          <span class="i-tabler-table h-4 w-4 text-muted" />
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'image'}>
          <span class="i-tabler-photo h-4 w-4 text-muted" />
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'audio'}>
          <span class="i-tabler-music h-4 w-4 text-muted" />
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'video'}>
          <span class="i-tabler-movie h-4 w-4 text-muted" />
        </Match>
        <Match when={fileFormat(props.path)?.kind === 'pdf'}>
          <span class="i-tabler-file-type-pdf h-4 w-4 text-red-600" />
        </Match>
      </Switch>
    </span>
  )
}
