import {Dialog} from '@kobalte/core/dialog'
import {cva, cx} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const modalContentClasses = cva(
  `fixed left-1/2 flex max-h-modal border border-solid border-border backdrop-blur-surface ` +
    `w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 flex-col overflow-hidden ` +
    `box-border rounded-panel bg-surface-strong ` +
    `text-foreground shadow-panel outline-none ` +
    `focus-visible:border-highlight motion-reduce:animate-none`,
  {
    defaultVariants: {
      placement: 'center',
      size: 'regular',
    },
    variants: {
      placement: {
        center: 'top-1/2 -translate-y-1/2 animate-modal-content-in',
        top:
          `top-modal-top max-h-modal-top translate-y-0 animate-modal-content-in-top ` +
          `max-[36rem]:top-modal-top-compact max-[36rem]:max-h-modal-top-compact`,
      },
      size: {
        regular: '',
        wide: 'w-[min(calc(100vw-2rem),42rem)]',
      },
    },
  },
)

const modalHeaderClasses = cva('flex-none', {
  defaultVariants: {
    layout: 'default',
  },
  variants: {
    layout: {
      closeOnly: 'flex items-start justify-end gap-4 border-b-0 px-3 pb-0 pt-3',
      default:
        'flex items-start justify-between gap-4 border-b border-solid border-border ' +
        'px-5 pb-4 pt-5',
      navigation:
        'grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-0 ' +
        'border-b border-solid border-border px-5 py-0 ' +
        'max-[36rem]:grid-cols-[minmax(0,1fr)_auto] max-[36rem]:px-4 ' +
        'max-[36rem]:pb-0 max-[36rem]:pt-3',
      navigationVisuallyHidden:
        'grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-0 ' +
        'border-b border-solid border-border p-0',
    },
  },
})

export interface PModalProps {
  readonly children: JSX.Element
  readonly contentOverflow?: 'auto' | 'hidden'
  readonly description?: string
  readonly getInitialFocus?: () => HTMLElement | null
  readonly headerMode?: 'closeOnly' | 'default'
  readonly isOpen: boolean
  readonly navigation?: JSX.Element
  readonly onCloseAutoFocus?: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly placement?: 'center' | 'top'
  readonly size?: 'regular' | 'wide'
  readonly title: string
  readonly titleVisibility?: 'visible' | 'visually-hidden'
}

const resolveHeaderLayout = (
  mode: PModalProps['headerMode'],
  hasNavigation: boolean,
  titleVisibility: PModalProps['titleVisibility'],
): 'closeOnly' | 'default' | 'navigation' | 'navigationVisuallyHidden' => {
  if ((mode ?? 'default') === 'closeOnly') {
    return 'closeOnly'
  }

  if (!hasNavigation) {
    return 'default'
  }

  return titleVisibility === 'visually-hidden' ? 'navigationVisuallyHidden' : 'navigation'
}

export const PModal = (props: PModalProps) => (
  <Dialog modal onOpenChange={props.onOpenChange} open={props.isOpen}>
    <Dialog.Portal>
      <Dialog.Overlay
        class={
          'fixed inset-0 bg-[rgb(8_6_4_/_68%)] backdrop-blur-[12px] ' +
          'animate-modal-overlay-in motion-reduce:animate-none'
        }
      />
      <Dialog.Content
        class={modalContentClasses({
          placement: props.placement ?? 'center',
          size: props.size ?? 'regular',
        })}
        data-placement={props.placement ?? 'center'}
        data-size={props.size ?? 'regular'}
        onCloseAutoFocus={(event) => {
          if (props.onCloseAutoFocus === undefined) {
            return
          }

          event.preventDefault()
          props.onCloseAutoFocus()
        }}
        onOpenAutoFocus={(event) => {
          const initialFocus = props.getInitialFocus?.()

          if (initialFocus === undefined || initialFocus === null) {
            return
          }

          event.preventDefault()
          initialFocus.focus()
        }}
      >
        <header
          class={modalHeaderClasses({
            layout: resolveHeaderLayout(
              props.headerMode,
              props.navigation !== undefined,
              props.titleVisibility,
            ),
          })}
          data-has-navigation={props.navigation === undefined ? undefined : ''}
          data-mode={props.headerMode ?? 'default'}
          data-title-visibility={props.titleVisibility ?? 'visible'}
        >
          <Show
            fallback={<Dialog.Title class="sr-only">{props.title}</Dialog.Title>}
            when={(props.headerMode ?? 'default') === 'default'}
          >
            <div
              class={cx(
                'min-w-0',
                props.titleVisibility === 'visually-hidden' && 'sr-only',
                props.navigation !== undefined && 'self-center',
              )}
            >
              <Dialog.Title class="m-0 text-lg font-750 leading-6 text-foreground">
                {props.title}
              </Dialog.Title>
              <Show when={props.description}>
                {(description) => (
                  <Dialog.Description
                    class={
                      'mb-0 ml-0 mr-0 mt-1.5 text-[0.8125rem] leading-5 ' +
                      'text-muted-foreground empty:hidden'
                    }
                  >
                    {description()}
                  </Dialog.Description>
                )}
              </Show>
            </div>
          </Show>
          <Show when={props.navigation}>
            {(navigation) => (
              <div
                class={cx(
                  'min-w-0 overflow-hidden',
                  props.titleVisibility === 'visually-hidden'
                    ? 'pl-1 max-[36rem]:col-span-1 ' +
                        'max-[36rem]:col-start-1 max-[36rem]:row-start-1'
                    : 'mx-6 max-[36rem]:col-span-full max-[36rem]:row-start-2 max-[36rem]:mx-0',
                )}
              >
                {navigation()}
              </div>
            )}
          </Show>
          <div
            class={cx(
              'flex flex-none items-center justify-center',
              props.navigation !== undefined && 'self-stretch',
              props.navigation !== undefined &&
                props.titleVisibility === 'visually-hidden' &&
                'border-l border-solid border-border px-3 ' +
                  'max-[36rem]:col-start-2 max-[36rem]:row-start-1 ' +
                  'max-[36rem]:px-2',
            )}
          >
            <Dialog.CloseButton
              aria-label="닫기"
              class={cx(
                'grid flex-none cursor-pointer place-items-center border-0 ' +
                  'rounded-control bg-transparent text-muted-foreground ' +
                  'outline-none transition-[background-color_140ms_ease,color_140ms_ease] ' +
                  'hover:bg-secondary-soft hover:text-foreground ' +
                  'focus-visible:shadow-focus motion-reduce:transition-none',
                props.navigation !== undefined && props.titleVisibility === 'visually-hidden'
                  ? 'size-11'
                  : 'size-9',
              )}
            >
              <span aria-hidden="true" class="i-tabler-x size-5" />
            </Dialog.CloseButton>
          </div>
        </header>
        <div
          class={cx(
            'min-h-0 overscroll-contain p-5 ' +
              '[scrollbar-color:rgb(255_250_241_/_24%)_transparent] [scrollbar-width:thin]',
            (props.contentOverflow ?? 'auto') === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto',
          )}
        >
          {props.children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
)
