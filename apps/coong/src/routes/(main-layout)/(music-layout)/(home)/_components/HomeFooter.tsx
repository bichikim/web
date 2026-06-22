import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

const footerLinks = [
  {
    href: '/terms',
    label: 'Terms of Service',
  },
  {
    href: '/privacy',
    label: 'Privacy Policy',
  },
  {
    href: '/contact',
    label: 'Contact',
  },
]

const homeFooterInnerClass = cx(
  ':uno: mx-auto flex max-w-1350px flex-col gap-5 border-t border-#dedede',
  'pt-6 text-3.5 text-#7a7f88 md:flex-row md:items-center md:justify-between',
)

export const HomeFooter = () => {
  return (
    <footer class=":uno: bg-#fbfaf8 px-6 pb-7 md:px-10 lg:px-24">
      <div class={homeFooterInnerClass}>
        <span>&copy; 2026 Coong. All rights reserved.</span>
        <nav class=":uno: flex flex-wrap gap-8 md:gap-10">
          <For each={footerLinks}>
            {(item) => (
              <A href={item.href} class=":uno: text-#7a7f88 no-underline hover:text-#101114">
                {item.label}
              </A>
            )}
          </For>
        </nav>
      </div>
    </footer>
  )
}
