import {cva, cx, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

// oxlint-disable-next-line eslint-js/max-len -- UnoCSS must extract the complete arbitrary-value utility.
const BUTTON_TRANSITION =
  'transition-[background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,transform_160ms_ease]'

const buttonClasses = cva(
  `group inline-flex box-border cursor-pointer items-center justify-center gap-2 border border-solid ` +
    `border-transparent rounded-[var(--pomo-radius-control)] font-[inherit] font-750 leading-4 ` +
    `outline-none ${BUTTON_TRANSITION} ` +
    `focus-visible:shadow-[0_0_0_2px_var(--pomo-brass)] disabled:cursor-not-allowed ` +
    `disabled:opacity-50 disabled:transform-none motion-reduce:transition-none`,
  {
    defaultVariants: {
      size: 'medium',
      tone: 'primary',
    },
    variants: {
      size: {
        medium: 'min-h-[var(--pomo-control-height-medium)] px-5 py-3 text-sm',
        small: 'min-h-[var(--pomo-control-height-small)] px-3.5 py-2 text-xs',
      },
      tone: {
        danger:
          'border-[rgb(239_138_116_/_34%)] bg-transparent text-[var(--pomo-danger)] hover:bg-[rgb(239_138_116_/_12%)]',
        glass:
          'border-[var(--pomo-border)] bg-[var(--pomo-glass)] text-[var(--pomo-text)] ' +
          'shadow-[var(--pomo-shadow)] backdrop-blur-[var(--pomo-backdrop-blur)] ' +
          'hover:-translate-y-px hover:border-[var(--pomo-border-hover)] hover:bg-[var(--pomo-glass-interactive)]',
        primary:
          'bg-[var(--pomo-accent-strong)] text-white ' +
          'shadow-[0_8px_24px_rgb(83_28_16_/_32%),inset_0_1px_0_rgb(255_255_255_/_16%)] ' +
          'hover:-translate-y-px hover:bg-[var(--pomo-accent-strong-hover)]',
        secondary:
          'border-[var(--pomo-border)] bg-[var(--pomo-secondary-soft)] text-[var(--pomo-text)] ' +
          'hover:border-[var(--pomo-border-hover)] hover:bg-[rgb(114_123_96_/_30%)]',
      },
    },
  },
)

export interface PButtonProps extends VariantProps<typeof buttonClasses> {
  readonly accessibleLabel?: string
  readonly children: JSX.Element
  readonly class?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly leadingImage?: string
  readonly onPress: (source: HTMLButtonElement) => void
  readonly trailingIcon?: string
  readonly type?: 'button' | 'reset' | 'submit'
}

export const PButton = (props: PButtonProps) => (
  <button
    aria-label={props.accessibleLabel}
    class={buttonClasses({class: props.class, size: props.size, tone: props.tone})}
    disabled={props.disabled}
    onClick={(event) => props.onPress(event.currentTarget)}
    type={props.type ?? 'button'}
  >
    <Show when={props.leadingImage}>
      {(source) => (
        <img
          alt=""
          aria-hidden="true"
          class="pomo-button__leading-image size-6 flex-none object-contain"
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
