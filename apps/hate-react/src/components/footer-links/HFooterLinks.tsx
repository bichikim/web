import {For, type JSX} from 'solid-js'

export interface FooterLinkItem {
  href: string
  label: string
}

export interface HFooterLinksProps {
  class?: string
  linkClass?: string
  links: FooterLinkItem[]
  separator?: string
  separatorClass?: string
}

/**
 * Headless: Renders list of links with separator between items
 */
export const HFooterLinks = (props: HFooterLinksProps): JSX.Element => {
  const separatorText = () => props.separator ?? 'or'

  return (
    <div class={props.class}>
      <For each={props.links}>
        {(link, index) => (
          <>
            {index() > 0 && <span class={props.separatorClass}>{separatorText()}</span>}
            <a class={props.linkClass} href={link.href}>
              {link.label}
            </a>
          </>
        )}
      </For>
    </div>
  )
}
