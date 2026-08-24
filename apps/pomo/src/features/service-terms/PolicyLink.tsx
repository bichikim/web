import {cva, type VariantProps} from 'class-variance-authority'
import {Show} from 'solid-js'

const policyLinkClasses = cva('rounded-sm text-inherit', {
  defaultVariants: {
    current: false,
    tone: 'surface',
  },
  variants: {
    current: {
      false:
        'underline decoration-current/45 underline-offset-3 transition-colors ' +
        'hover:text-foreground focus-visible:text-foreground focus-visible:shadow-focus ' +
        'focus-visible:outline-none motion-reduce:transition-none',
      true: 'font-700 no-underline',
    },
    tone: {
      overlay: 'hover:text-white focus-visible:text-white',
      surface: '',
    },
  },
})

interface PolicyLinkProps extends VariantProps<typeof policyLinkClasses> {
  href: string
  label: string
}

export const PolicyLink = (props: PolicyLinkProps) => (
  <Show
    fallback={
      <a class={policyLinkClasses({tone: props.tone})} href={props.href}>
        {props.label}
      </a>
    }
    when={props.current}
  >
    <span aria-current="page" class={policyLinkClasses({current: true, tone: props.tone})}>
      {props.label}
    </span>
  </Show>
)
