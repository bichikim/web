import {createMemo, Match, Switch} from 'solid-js'

interface SFileIconProps {
  path: string
}
export const SFileIcon = (props: SFileIconProps) => {
  const extension = createMemo(() => props.path.split('.').at(-1)?.toLowerCase() ?? '')
  return (
    <span aria-hidden="true" class="flex h-4 w-4 shrink-0 items-center justify-center">
      <Switch
        fallback={
          <svg
            class="h-4 w-4 fill-none stroke-current text-muted [stroke-width:1.4]"
            viewBox="0 0 24 24"
          >
            <path d="M5 3h9l5 5v13H5V3Zm9 0v6h5" />
          </svg>
        }
      >
        <Match when={['tsx', 'jsx'].includes(extension())}>
          <svg
            class="h-4 w-4 fill-none stroke-current text-cyan-600 [stroke-width:1.2]"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="1.5" class="fill-current" />
            <ellipse cx="12" cy="12" rx="11" ry="4" />
            <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(120 12 12)" />
          </svg>
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
        <Match when={extension() === 'md'}>
          <span class="text-xs font-semibold text-green-600">M↓</span>
        </Match>
      </Switch>
    </span>
  )
}
