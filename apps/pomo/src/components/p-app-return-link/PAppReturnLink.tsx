import * as m from '@paraglide/message'

export interface PAppReturnLinkProps {
  readonly href?: string
  readonly label?: string
}

export const PAppReturnLink = (props: PAppReturnLinkProps) => (
  <a
    class={
      'min-h-11 inline-flex items-center gap-2 rounded-full border border-solid border-border ' +
      'px-4 text-base text-foreground no-underline'
    }
    href={props.href ?? '/'}
  >
    <span aria-hidden="true" class="i-tabler-arrow-left size-5 flex-none" />
    {props.label ?? m.app_return()}
  </a>
)
