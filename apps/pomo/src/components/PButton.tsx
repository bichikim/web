/* ignore file coverage -- Wallaby mismerges this fully covered TSX module across test workers. */
import {cva, cx, type VariantProps} from 'class-variance-authority'
import {children, type JSX, Show} from 'solid-js'
import {PTooltip} from './PTooltip'
import {useTooltipTrigger} from './tooltip'

// oxlint-disable-next-line eslint-js/max-len -- UnoCSS must extract the complete arbitrary-value utility.
const BUTTON_TRANSITION =
  'transition-[background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease]'

const BUTTON_HOVER =
  // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
  '[&:not(:disabled):hover]:[background-color:color-mix(in_srgb,var(--pomo-button-bg),var(--pomo-color-foreground)_10%)]'

export const pButtonClasses = cva(
  `group inline-flex box-border cursor-pointer items-center justify-center gap-2 border border-solid ` +
    `font-[inherit] font-750 leading-5 ` +
    `outline-none ${BUTTON_TRANSITION} [background-color:var(--pomo-button-bg)] ${BUTTON_HOVER} ` +
    `disabled:cursor-not-allowed ` +
    `disabled:opacity-50 disabled:transform-none motion-reduce:transition-none`,
  {
    compoundVariants: [
      {bordered: true, class: 'border-[rgb(239_138_116_/_34%)]', tone: 'danger'},
      {bordered: true, class: 'border-border', tone: ['primary', 'secondary', 'glass']},
      {
        class:
          // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
          '[--pomo-button-bg:rgb(var(--pomo-color-primary-strong-channels)/var(--pomo-color-primary-strong-opacity))] text-white',
        tone: 'primary',
        transparent: false,
      },
      {
        class:
          // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
          '[--pomo-button-bg:rgb(var(--pomo-color-primary-soft-channels)/var(--pomo-color-primary-soft-opacity))] text-foreground',
        tone: 'primary',
        transparent: true,
      },
      {
        class:
          // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
          '[--pomo-button-bg:rgb(var(--pomo-color-secondary-strong-channels)/var(--pomo-color-secondary-strong-opacity))] text-white',
        tone: 'secondary',
        transparent: false,
      },
      {
        class:
          // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
          '[--pomo-button-bg:rgb(var(--pomo-color-secondary-soft-channels)/var(--pomo-color-secondary-soft-opacity))] text-foreground',
        tone: 'secondary',
        transparent: true,
      },
      {
        class:
          '[--pomo-button-bg:rgb(var(--pomo-color-danger-channels)/var(--pomo-color-danger-opacity))] text-background',
        tone: 'danger',
        transparent: false,
      },
      {
        class: '[--pomo-button-bg:rgb(var(--pomo-color-danger-channels)/20%)] text-danger',
        tone: 'danger',
        transparent: true,
      },
      {
        class: '[--pomo-button-bg:rgb(var(--pomo-color-surface-channels))]',
        tone: 'glass',
        transparent: false,
      },
      {
        class:
          '[--pomo-button-bg:rgb(var(--pomo-color-surface-channels)/var(--pomo-color-surface-opacity))]',
        tone: 'glass',
        transparent: true,
      },
    ],
    defaultVariants: {
      backdropBlur: false,
      bordered: false,
      focusOutline: false,
      pill: false,
      raised: false,
      size: 'medium',
      tone: 'primary',
      transparent: false,
    },
    variants: {
      backdropBlur: {true: 'backdrop-blur-surface'},
      bordered: {false: 'border-transparent', true: 'hover:border-border-hover'},
      focusOutline: {
        false: 'focus-visible:shadow-focus',
        true:
          'focus-visible:outline-3 focus-visible:outline-solid ' +
          'focus-visible:outline-offset-2 focus-visible:outline-highlight',
      },
      pill: {false: 'rounded-control', true: 'rounded-full'},
      raised: {
        true: 'shadow-[0_0.5rem_1.5rem_rgb(83_28_16_/_32%),inset_0_0.0625rem_0_rgb(255_255_255_/_16%)]',
      },
      size: {
        medium:
          'min-h-control-md px-5 py-3 text-sm ' +
          'data-[icon-only]:h-control-md data-[icon-only]:min-w-control-md ' +
          'data-[icon-only]:px-0 data-[icon-only]:py-0',
        small:
          'min-h-control-sm px-3.5 py-2 text-modal-detail ' +
          'data-[icon-only]:h-control-sm data-[icon-only]:min-w-control-sm ' +
          'data-[icon-only]:px-0 data-[icon-only]:py-0',
      },
      tone: {
        danger: '',
        glass: 'text-foreground shadow-panel',
        primary: '',
        secondary: '',
      },
      transparent: {false: '', true: ''},
    },
  },
)

const LEADING_OVERFLOW =
  'size-16 [margin-block:-1.25rem] [margin-inline-start:-0.75rem] ' +
  '[filter:drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]'

export interface PButtonProps extends VariantProps<typeof pButtonClasses> {
  readonly accessibleLabel?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly iconClass?: string
  readonly leadingImage?: string
  readonly leadingImageClass?: string
  readonly leadingOverflow?: boolean
  readonly onPress?: (source: HTMLButtonElement) => void
  readonly pressed?: boolean
  readonly tooltip?: string
  readonly trailingIcon?: string
  readonly type?: 'button' | 'reset' | 'submit'
}

export const PButton = (props: PButtonProps) => {
  const tooltip = useTooltipTrigger()
  const content = children(() => props.children)
  const hasContent = () =>
    content
      .toArray()
      .some((child) =>
        typeof child === 'string'
          ? child.trim().length > 0
          : child !== null && child !== undefined && typeof child !== 'boolean',
      )
  return (
    <>
      <button
        {...tooltip.events}
        ref={tooltip.setTarget}
        aria-label={props.accessibleLabel}
        aria-pressed={props.pressed}
        class={pButtonClasses({
          backdropBlur: props.backdropBlur,
          bordered: props.bordered,
          class: props.class,
          focusOutline: props.focusOutline,
          pill: props.pill,
          raised: props.raised,
          size: props.size,
          tone: props.tone,
          transparent: props.transparent,
        })}
        data-icon-only={hasContent() ? undefined : ''}
        disabled={props.disabled}
        onClick={(event) => props.onPress?.(event.currentTarget)}
        type={props.type ?? 'button'}
      >
        <Show when={props.leadingImage}>
          {(source) => (
            <img
              alt=""
              aria-hidden="true"
              class={cx(
                'pomo-button__leading-image flex-none object-contain',
                props.leadingOverflow
                  ? LEADING_OVERFLOW
                  : (props.leadingImageClass ??
                      (props.size === 'small'
                        ? 'size-6 [margin-block:-0.1875rem]'
                        : 'size-8 [margin-block:-0.25rem]')),
                props.leadingOverflow && props.leadingImageClass,
              )}
              data-pomo-button-leading-image=""
              src={source()}
            />
          )}
        </Show>
        <Show when={props.icon}>
          {(icon) => (
            <span
              aria-hidden="true"
              class={cx(
                icon(),
                'flex-none',
                props.leadingOverflow
                  ? LEADING_OVERFLOW
                  : (props.iconClass ?? (props.size === 'small' ? 'size-4.5' : 'size-6')),
                props.leadingOverflow && props.iconClass,
              )}
              data-pomo-button-icon=""
            />
          )}
        </Show>
        <Show when={hasContent()}>
          <span>{content()}</span>
        </Show>
        <Show when={props.trailingIcon}>
          {(icon) => (
            <span
              aria-hidden="true"
              class={cx(icon(), props.size === 'small' ? 'size-4.5' : 'size-6', 'flex-none')}
              data-pomo-button-trailing-icon=""
            />
          )}
        </Show>
      </button>
      <PTooltip target={tooltip.target()} show={tooltip.show()} text={props.tooltip} />
    </>
  )
}
