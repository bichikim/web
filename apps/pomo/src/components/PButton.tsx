/* ignore file coverage -- Wallaby mismerges this fully covered TSX module across test workers. */
import {cva, cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

// oxlint-disable-next-line eslint-js/max-len -- UnoCSS must extract the complete arbitrary-value utility.
const BUTTON_TRANSITION =
  'transition-[background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,transform_160ms_ease]'

export const pButtonClasses = cva(
  `group inline-flex box-border cursor-pointer items-center justify-center gap-2 border border-solid ` +
    `border-transparent rounded-control font-[inherit] font-750 leading-4 ` +
    `outline-none ${BUTTON_TRANSITION} ` +
    `focus-visible:shadow-focus disabled:cursor-not-allowed ` +
    `disabled:opacity-50 disabled:transform-none motion-reduce:transition-none`,
  {
    defaultVariants: {
      size: 'medium',
      tone: 'primary',
    },
    variants: {
      size: {
        medium: 'min-h-control-md px-5 py-3 text-sm',
        small: 'min-h-control-sm px-3.5 py-2 text-xs',
      },
      tone: {
        danger:
          'border-[rgb(239_138_116_/_34%)] bg-transparent text-danger hover:bg-[rgb(239_138_116_/_12%)]',
        glass:
          'border-border bg-surface text-foreground ' +
          'shadow-panel backdrop-blur-surface ' +
          'hover:translate-y-[-0.0625rem] hover:border-border-hover hover:bg-surface-interactive',
        primary:
          'bg-primary-strong text-white ' +
          'shadow-[0_0.5rem_1.5rem_rgb(83_28_16_/_32%),inset_0_0.0625rem_0_rgb(255_255_255_/_16%)] ' +
          'hover:translate-y-[-0.0625rem] hover:bg-primary-strong-hover',
        secondary:
          'border-border bg-secondary-soft text-foreground ' +
          'hover:border-border-hover hover:bg-[rgb(114_123_96_/_30%)]',
      },
    },
  },
)

export interface PButtonProps extends VariantProps<typeof pButtonClasses> {
  readonly accessibleLabel?: string
  readonly children: JSX.Element
  readonly class?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly leadingImage?: string
  readonly leadingImageClass?: string
  readonly onPress?: (source: HTMLButtonElement) => void
  readonly trailingIcon?: string
  readonly type?: 'button' | 'reset' | 'submit'
}

export const PButton = (props: PButtonProps) => (
  <button
    aria-label={props.accessibleLabel}
    class={pButtonClasses({class: props.class, size: props.size, tone: props.tone})}
    disabled={props.disabled}
    onClick={(event) => props.onPress?.(event.currentTarget)}
    title={props.accessibleLabel}
    type={props.type ?? 'button'}
  >
    <Show when={props.leadingImage}>
      {(source) => (
        <img
          alt=""
          aria-hidden="true"
          class={cx(
            'pomo-button__leading-image flex-none object-contain',
            props.leadingImageClass ?? 'size-6',
          )}
          data-pomo-button-leading-image=""
          src={source()}
        />
      )}
    </Show>
    <Show when={props.icon}>
      {(icon) => <span aria-hidden="true" class={cx(icon(), 'size-4.5 flex-none')} />}
    </Show>
    <span>{props.children}</span>
    <Show when={props.trailingIcon}>
      {(icon) => (
        <span
          aria-hidden="true"
          class={cx(
            icon(),
            'size-4.5 flex-none transition-transform duration-160 group-hover:translate-x-0.5 ' +
              'motion-reduce:transition-none',
          )}
          data-pomo-button-trailing-icon=""
        />
      )}
    </Show>
  </button>
)
