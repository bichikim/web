/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {HFooterLinks} from '../footer-links/HFooterLinks'
import {SFooterLinks} from '../footer-links/SFooterLinks'
import {footerLinksContainerStyles, footerLinkStyles} from '../footer-links/footer-links.style'
import {HHamsterTrigger} from '../hamster-trigger/HHamsterTrigger'
import {SHamsterTrigger} from '../hamster-trigger/SHamsterTrigger'
import {hamsterTriggerStyles} from '../hamster-trigger/hamster-trigger.style'
import {HOpinionDisplay} from '../opinion-display/HOpinionDisplay'
import {SOpinionDisplay} from '../opinion-display/SOpinionDisplay'
import {opinionDisplayStyles} from '../opinion-display/opinion-display.style'
import {SHomeLayout} from '../page-layout/SHomeLayout'

describe('presentation components', () => {
  it('should render headless and styled footer links with separators', () => {
    const links = [
      {href: '/first', label: 'First'},
      {href: '/second', label: 'Second'},
    ]
    const headless = render(() => <HFooterLinks links={links} separator="and" />)
    const styled = render(() => <SFooterLinks links={links} />)

    expect(headless.getByText('and')).toBeDefined()
    expect(headless.getByRole('link', {name: 'Second'}).getAttribute('href')).toBe('/second')
    expect(styled.getByText('or')).toBeDefined()
    expect(footerLinkStyles()).toContain('text-amber-400')
    expect(footerLinksContainerStyles()).toContain('mt-8')
  })

  it('should prevent hamster navigation and forward clicks', async () => {
    const onClick = vi.fn()
    const headless = render(() => <HHamsterTrigger onClick={onClick}>Hamster</HHamsterTrigger>)
    const styled = render(() => <SHamsterTrigger onClick={onClick} />)

    const clicked = await fireEvent.click(headless.getByRole('button', {name: 'Hamster'}))

    expect(clicked).toBe(false)
    expect(onClick).toHaveBeenCalledOnce()
    expect(styled.getByRole('img', {name: 'hamster'})).toBeDefined()
    expect(hamsterTriggerStyles()).toContain('cursor-pointer')
  })

  it('should render opinion and layout presentation variants', () => {
    const headless = render(() => (
      <HOpinionDisplay message="unused">
        <span>Child content</span>
      </HOpinionDisplay>
    ))
    const styled = render(() => <SOpinionDisplay message="Opinion" variant="empty" />)
    const layout = render(() => <SHomeLayout class="custom">Page</SHomeLayout>)

    expect(headless.getByText('Child content')).toBeDefined()
    expect(styled.getByText('Opinion').className).toContain('opacity-60')
    expect(opinionDisplayStyles({variant: 'empty'})).toContain('opacity-60')
    expect(layout.getByRole('main').className).toContain('custom')
  })
})
