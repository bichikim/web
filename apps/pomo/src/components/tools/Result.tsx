import {createSignal, type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {copyToolResult} from 'src/features/tools'
import {PButton} from '../PButton'

interface ResultProps {
  readonly children?: JSX.Element
  readonly value: string
  readonly label?: string
}
export const Result = (props: ResultProps) => {
  const [message, setMessage] = createSignal('')
  const [copied, setCopied] = createSignal('')
  const handleCopy = async (value: string) => {
    const success = await copyToolResult(value)
    setCopied(value)
    setMessage(success ? m.tools_copied() : m.tools_copy_failed())
  }
  return (
    <section
      class="grid gap-3 border-t border-solid border-border pt-4"
      aria-label={props.label ?? m.tools_result()}
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-650 leading-5 text-muted-foreground">
          {props.label ?? m.tools_result()}
        </span>
        <PButton
          tone="glass"
          transparent
          size="small"
          onPress={() => handleCopy(props.value)}
          icon="i-tabler-copy"
        >
          {m.tools_copy()}
        </PButton>
      </div>
      <output
        class={
          'select-text break-all whitespace-pre-wrap text-base font-500 leading-7 ' +
          'tabular-nums text-foreground'
        }
      >
        {props.children ?? props.value}
      </output>
      <Show when={copied() === props.value && message()}>
        <p role="status" class="m-0 text-sm text-muted-foreground">
          {message()}
        </p>
      </Show>
    </section>
  )
}
