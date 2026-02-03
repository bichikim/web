import {IconLink} from './IconLink'

const links = [
  {href: 'mailto:bichi@live.co.kr', ariaLabel: 'Email', icon: 'i-tabler:mail'},
  {href: 'https://github.com/bichikim', ariaLabel: 'GitHub', icon: 'i-tabler:brand-github', external: true},
  {href: 'https://bichi.kim/', ariaLabel: 'Notion', icon: 'i-tabler:brand-notion', external: true},
] as const

/** Contact nav: email, GitHub, Notion. */
export function ContactLinks() {
  return (
    <nav class="mt-4 flex gap-2" aria-label="Contact links">
      {links.map((link) => (
        <IconLink href={link.href} ariaLabel={link.ariaLabel} external={link.external}>
          <span class={`${link.icon} size-6 block`} aria-hidden />
        </IconLink>
      ))}
    </nav>
  )
}
