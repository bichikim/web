import {cva, cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const textClasses = cva(
  [
    'min-w-0 overflow-hidden m-0 text-foreground text-xs font-[650] leading-[1.5]',
    'text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [white-space:normal]',
  ],
  {
    defaultVariants: {lineLimit: 'three'},
    variants: {
      lineLimit: {
        six: '[-webkit-line-clamp:6]',
        three: '[-webkit-line-clamp:3]',
      },
    },
  },
)

const CLASSES = {
  actions: cx(
    'flex flex-none flex-wrap gap-[0.4rem] [&_button]:inline-flex [&_button]:min-h-9',
    '[&_button]:box-border [&_button]:cursor-pointer [&_button]:items-center',
    '[&_button]:justify-center [&_button]:gap-[0.35rem] [&_button]:border',
    '[&_button]:border-solid [&_button]:border-border [&_button]:rounded-control',
    '[&_button]:bg-transparent [&_button]:px-3 [&_button]:py-0',
    '[&_button]:text-muted-foreground [&_button]:[font:inherit]',
    '[&_button]:text-[0.7rem] [&_button]:font-bold [&_button]:no-underline',
    '[&_a]:inline-flex [&_a]:min-h-9 [&_a]:box-border [&_a]:cursor-pointer',
    '[&_a]:items-center [&_a]:justify-center [&_a]:gap-[0.35rem] [&_a]:border',
    '[&_a]:border-solid [&_a]:border-border [&_a]:rounded-control [&_a]:bg-transparent',
    '[&_a]:px-3 [&_a]:py-0 [&_a]:text-muted-foreground [&_a]:[font:inherit]',
    '[&_a]:text-[0.7rem] [&_a]:font-bold [&_a]:no-underline',
    '[&_button:hover]:bg-secondary-soft [&_button:hover]:text-foreground',
    '[&_a:hover]:bg-secondary-soft [&_a:hover]:text-foreground',
    '[&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid',
    '[&_button:focus-visible]:outline-highlight [&_button:focus-visible]:[outline-offset:0.125rem]',
    '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-solid',
    '[&_a:focus-visible]:outline-highlight [&_a:focus-visible]:[outline-offset:0.125rem]',
    '[&_[data-pomo-dialogue-delete-confirm]]:border-danger/50',
    '[&_[data-pomo-dialogue-delete-confirm]]:text-danger',
    "dialogue-library-compact:[&_>_:is(button,_a)_>_[aria-hidden='true']]:hidden",
    'motion-reduce:[&_button]:transition-[none] motion-reduce:[&_a]:transition-[none]',
  ),
  item: cx(
    'grid gap-3 rounded-panel border border-solid border-content-border',
    'bg-content-surface px-4 py-3',
  ),
  layout: cx(
    'pomo-dialogue-settings__selected-dialogue--library flex flex-col items-stretch gap-3',
    '[container:pomo-dialogue-library-item_/_inline-size]',
    'settings-compact:gap-2',
  ),
  metadata: 'mt-1 block text-[0.625rem] text-muted-foreground',
  summary: 'min-w-0 flex-1',
} as const

export interface DialogueLibraryItemProps extends VariantProps<typeof textClasses> {
  readonly actions?: JSX.Element
  readonly metadata?: JSX.Element
  readonly text: string
}

export const DialogueLibraryItem = (props: DialogueLibraryItemProps) => (
  <li class={CLASSES.item}>
    <div class={CLASSES.layout}>
      <div class={CLASSES.summary}>
        <p class={textClasses({lineLimit: props.lineLimit})}>{props.text}</p>
        <Show when={props.metadata}>
          <span class={CLASSES.metadata}>{props.metadata}</span>
        </Show>
      </div>
      <Show when={props.actions}>
        <div class={CLASSES.actions}>{props.actions}</div>
      </Show>
    </div>
  </li>
)
