import {createMemo, For, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface InlineIconTextProps {
  readonly text: string
  readonly icons?: Readonly<Record<string, string>>
}

/** Replaces registered [icon:name] tokens with decorative icons; preserves all other text. */
export const InlineIconText = (props: InlineIconTextProps) => {
  const parts = createMemo(() => {
    const iconClasses = props.icons
    return props.text.split(/(?<token>\[icon:[\w-]+\])/gu).map((text) => {
      const name = /^\[icon:(?<name>[\w-]+)\]$/u.exec(text)?.groups?.name
      return {
        icon:
          name !== undefined && iconClasses !== undefined && Object.hasOwn(iconClasses, name)
            ? iconClasses[name]
            : undefined,
        text,
      }
    })
  })

  return (
    <For each={parts()}>
      {(part) => (
        <Show when={part.icon} fallback={part.text}>
          {(icon) => (
            <span
              aria-hidden="true"
              class={cx(icon(), 'inline-block size-[1em] align-[-0.125em]')}
            />
          )}
        </Show>
      )}
    </For>
  )
}
