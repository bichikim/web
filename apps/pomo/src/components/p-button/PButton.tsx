/* ignore file coverage -- Wallaby mismerges this fully covered TSX module across test workers. */
import {cva, cx, type VariantProps} from 'class-variance-authority'
import {children, type JSX, Show} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {HButton} from '../h-button'
import {PTooltip} from '../p-tooltip/PTooltip'
import {TEXT_DETAIL} from '../typography-classes'
import {useTooltipTrigger} from '../tooltip'
import {CONTROL_HEIGHT_CLASSES, CONTROL_PADDING_CLASSES} from '../control-size-classes'

// oxlint-disable-next-line eslint-js/max-len -- UnoCSS must extract the complete arbitrary-value utility.
const BUTTON_TRANSITION =
  'transition-[background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease]'

const BUTTON_HOVER =
  // oxlint-disable-next-line eslint-js/max-len -- UnoCSS requires a complete arbitrary-value token.
  '[&:not(:disabled):not([aria-disabled=true]):hover]:[background-color:color-mix(in_srgb,var(--pomo-button-bg),var(--pomo-color-foreground)_10%)]'

export const P_BUTTON_CLASSES = cva(
  `group inline-flex box-border cursor-pointer items-center justify-center gap-2 border border-solid ` +
    `font-[inherit] font-750 leading-5 ` +
    `outline-none ${BUTTON_TRANSITION} [background-color:var(--pomo-button-bg)] ${BUTTON_HOVER} ` +
    `disabled:cursor-not-allowed ` +
    `disabled:opacity-50 disabled:transform-none motion-reduce:transition-none ` +
    `[&[aria-disabled=true]]:cursor-not-allowed [&[aria-disabled=true]]:opacity-50`,
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
          `${CONTROL_HEIGHT_CLASSES.medium} px-5 ${CONTROL_PADDING_CLASSES.medium} text-sm ` +
          'data-[icon-only]:h-control-md data-[icon-only]:min-w-control-md ' +
          'data-[icon-only]:px-0 data-[icon-only]:py-0',
        small: cx(
          `${CONTROL_HEIGHT_CLASSES.small} px-3.5 ${CONTROL_PADDING_CLASSES.small}`,
          TEXT_DETAIL,
          'data-[icon-only]:h-control-sm data-[icon-only]:min-w-control-sm',
          'data-[icon-only]:px-0 data-[icon-only]:py-0',
        ),
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

export interface PButtonAppearanceProps extends VariantProps<typeof P_BUTTON_CLASSES> {
  readonly accessibleLabel?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly contentClass?: string
  readonly disabled?: boolean
  readonly icon?: string
  readonly iconClass?: string
  readonly leadingImage?: string
  readonly leadingImageClass?: string
  readonly leadingOverflow?: boolean
  readonly pressed?: boolean
  readonly tooltip?: string
  readonly trailingIcon?: string
}

export interface PButtonProps extends PButtonAppearanceProps {
  readonly href?: undefined
  readonly onBlur?: JSX.EventHandler<HTMLButtonElement, FocusEvent>
  readonly onKeyDown?: JSX.EventHandler<HTMLButtonElement, KeyboardEvent>
  readonly onPress?: (source: HTMLButtonElement) => void
  readonly type?: 'button' | 'reset' | 'submit'
}

export interface PButtonLinkProps extends PButtonAppearanceProps {
  readonly href: string
  readonly onBlur?: JSX.EventHandler<HTMLAnchorElement, FocusEvent>
  readonly onKeyDown?: JSX.EventHandler<HTMLAnchorElement, KeyboardEvent>
  readonly onPress?: (source: HTMLAnchorElement) => void
  readonly type?: never
}

const isButtonEvent = <EventType extends Event>(
  event: EventType & {currentTarget: HTMLButtonElement | HTMLAnchorElement},
): event is EventType & {currentTarget: HTMLButtonElement} =>
  event.currentTarget instanceof HTMLButtonElement

const isLinkEvent = <EventType extends Event>(
  event: EventType & {currentTarget: HTMLButtonElement | HTMLAnchorElement},
): event is EventType & {currentTarget: HTMLAnchorElement} =>
  event.currentTarget instanceof HTMLAnchorElement

export interface PButtonComponent {
  (props: PButtonLinkProps): JSX.Element
  (props: PButtonProps): JSX.Element
}

export const PButton: PButtonComponent = (props: PButtonProps | PButtonLinkProps) => {
  const tooltip = useTooltipTrigger()
  const handleBlur: JSX.EventHandler<HTMLButtonElement | HTMLAnchorElement, FocusEvent> = (
    event,
  ) => {
    tooltip.onBlur()
    if (props.href === undefined && isButtonEvent(event)) {
      props.onBlur?.(event)
    } else if (props.href !== undefined && isLinkEvent(event)) {
      props.onBlur?.(event)
    }
  }
  const handleKeyDown: JSX.EventHandler<HTMLButtonElement | HTMLAnchorElement, KeyboardEvent> = (
    event,
  ) => {
    if (props.href === undefined && isButtonEvent(event)) {
      props.onKeyDown?.(event)
    } else if (props.href !== undefined && isLinkEvent(event)) {
      props.onKeyDown?.(event)
    }
  }
  const handlePress: JSX.EventHandler<HTMLButtonElement | HTMLAnchorElement, MouseEvent> = (
    event,
  ) => {
    if (props.disabled) {
      event.preventDefault()
      return
    }
    if (props.href === undefined && isButtonEvent(event)) {
      props.onPress?.(event.currentTarget)
    } else if (props.href !== undefined && isLinkEvent(event)) {
      props.onPress?.(event.currentTarget)
    }
  }
  const content = children(() => props.children)
  const hasContent = () =>
    content
      .toArray()
      .some((child) =>
        typeof child === 'string'
          ? isNonBlankString(child)
          : child !== null && child !== undefined && typeof child !== 'boolean',
      )
  return (
    <>
      <Dynamic
        component={props.href === undefined ? HButton.Root : 'a'}
        ref={tooltip.setTarget}
        aria-label={props.accessibleLabel}
        aria-pressed={props.href === undefined ? props.pressed : undefined}
        aria-disabled={props.href !== undefined && props.disabled ? true : undefined}
        role={props.href !== undefined && props.disabled ? 'link' : undefined}
        class={P_BUTTON_CLASSES({
          backdropBlur: props.backdropBlur,
          bordered: props.bordered,
          class: cx(props.href !== undefined && 'no-underline', props.class),
          focusOutline: props.focusOutline,
          pill: props.pill,
          raised: props.raised,
          size: props.size,
          tone: props.tone,
          transparent: props.transparent,
        })}
        data-icon-only={hasContent() ? undefined : ''}
        disabled={props.href === undefined ? props.disabled : undefined}
        href={props.disabled ? undefined : props.href}
        tabIndex={props.href !== undefined && props.disabled ? -1 : undefined}
        onBlur={handleBlur}
        onFocus={tooltip.onFocus}
        onKeyDown={handleKeyDown}
        onClick={handlePress}
        onPointerDown={tooltip.onPointerDown}
        onPointerEnter={tooltip.onPointerEnter}
        onPointerLeave={tooltip.onPointerLeave}
        type={props.href === undefined ? (props.type ?? 'button') : undefined}
      >
        <Show when={props.leadingImage}>
          {(source) => (
            <HButton.LeadingImage
              class={cx(
                'flex-none object-contain',
                props.leadingOverflow
                  ? LEADING_OVERFLOW
                  : (props.leadingImageClass ??
                      (props.size === 'small'
                        ? 'size-6 [margin-block:-0.1875rem]'
                        : 'size-8 [margin-block:-0.25rem]')),
                props.leadingOverflow && props.leadingImageClass,
              )}
              src={source()}
            />
          )}
        </Show>
        <Show when={props.icon}>
          {(icon) => (
            <HButton.Icon
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
          <HButton.Content class={props.contentClass}>{content()}</HButton.Content>
        </Show>
        <Show when={props.trailingIcon}>
          {(icon) => (
            <HButton.Icon
              class={cx(icon(), props.size === 'small' ? 'size-4.5' : 'size-6', 'flex-none')}
            />
          )}
        </Show>
      </Dynamic>
      <PTooltip target={tooltip.target()} show={tooltip.show()} text={props.tooltip} />
    </>
  )
}
