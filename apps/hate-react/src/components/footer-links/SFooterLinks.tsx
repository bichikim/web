import {splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'
import {type FooterLinkItem, HFooterLinks} from './HFooterLinks'
import {footerLinksContainerStyles, footerLinkStyles} from './footer-links.style'

export interface SFooterLinksProps {
  class?: string
  links: FooterLinkItem[]
  separator?: string
}

/**
 * Styled footer links - Submit / Buy beer with amber styling
 */
export const SFooterLinks = (props: SFooterLinksProps) => {
  const [local] = splitProps(props, ['links', 'separator', 'class'])

  return (
    <HFooterLinks
      class={cx(footerLinksContainerStyles(), local.class)}
      linkClass={footerLinkStyles()}
      links={local.links}
      separator={local.separator}
      separatorClass="text-gray-600"
    />
  )
}
