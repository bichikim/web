/* ignore file coverage -- Wallaby mismerges this fully covered TSX module across test workers. */
import {cva, type VariantProps} from 'class-variance-authority'
import {type JSX, Show} from 'solid-js'

const sectionHeadingClasses = cva(
  [
    'flex items-center gap-[0.45rem]',
    '[&_h3]:m-0 [&_h3]:text-[0.9375rem] [&_h3]:font-[750] [&_h3]:text-foreground',
    '[&_>_span]:text-[0.6875rem] [&_>_span]:text-muted-foreground',
  ],
  {
    defaultVariants: {divider: 'top'},
    variants: {
      divider: {
        none: 'border-t-0 pt-0',
        top: 'border-t border-solid border-border pt-4',
      },
    },
  },
)

export interface PSettingsSectionHeadingProps extends VariantProps<typeof sectionHeadingClasses> {
  readonly actions?: JSX.Element
  readonly class?: string
  readonly count?: JSX.Element
  readonly title: JSX.Element
  readonly titleId?: string
}

export const PSettingsSectionHeading = (props: PSettingsSectionHeadingProps) => (
  <div class={sectionHeadingClasses({class: props.class, divider: props.divider})}>
    <h3 id={props.titleId}>{props.title}</h3>
    <Show when={props.count !== undefined}>
      <span>{props.count}</span>
    </Show>
    {props.actions}
  </div>
)
