/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {AppTitle} from '../app-title/AppTitle'
import {buttonStyles} from '../button/s-button.style'
import {HCard} from '../card/HCard'
import {SCard} from '../card/SCard'
import {SDivider} from '../divider/SDivider'
import {MiniNav} from '../nimi-nav/MiniNav'
import {NavList} from '../nimi-nav/NavList'
import {SScale} from '../scale/SScale'
import {HSelectItem} from '../select/HSelectItem'
import {HSelectPortal} from '../select/HSeletePortal'
import {HSelectRoot} from '../select/HSelectRoot'
import {useSelectContext} from '../select/context'

describe('basic presentation components', () => {
  it('should render the application title and navigation labels', () => {
    render(() => (
      <>
        <AppTitle />
        <MiniNav class="mini-nav" />
        <NavList />
      </>
    ))

    expect(screen.getByRole('heading', {name: 'Welcome to Coong World'})).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toHaveClass('mini-nav')
    expect(screen.getAllByText('Home')).toHaveLength(2)
  })

  it('should render headless and styled cards with caller attributes', () => {
    render(() => (
      <>
        <HCard component="section" data-testid="headless-card">
          headless
        </HCard>
        <SCard data-testid="styled-card" class="custom-card">
          styled
        </SCard>
      </>
    ))

    expect(screen.getByTestId('headless-card').tagName).toBe('SECTION')
    expect(screen.getByTestId('headless-card')).toHaveTextContent('headless')
    expect(screen.getByTestId('styled-card')).toHaveClass('custom-card')
  })

  it('should apply divider orientation and scaled layout styles', () => {
    render(() => (
      <>
        <SDivider type="vertical" data-testid="divider">
          divider
        </SDivider>
        <SScale size={50} data-testid="scale">
          scaled
        </SScale>
      </>
    ))

    expect(screen.getByTestId('divider')).toHaveClass('w-full')
    expect(screen.getByTestId('scale')).toHaveStyle({transform: 'scale(0.5)', width: '0.5%'})
  })

  it('should resolve button style variants', () => {
    const classes = buttonStyles({color: 'primary', fit: true, flat: true, size: 'sm'})

    expect(classes).toContain('var-color=blue-400')
    expect(classes).toContain('var-padding=.1rem')
  })
})

describe('headless select primitives', () => {
  const Consumer = () => {
    const context = useSelectContext()
    return (
      <button onClick={() => context.onOpenChange(!context.open())}>
        {String(context.open())}
      </button>
    )
  }

  it('should provide reactive open state and report changes', async () => {
    const onOpenChange = vi.fn()
    render(() => (
      <HSelectRoot defaultOpen onOpenChange={onOpenChange}>
        <Consumer />
      </HSelectRoot>
    ))

    const button = screen.getByRole('button', {name: 'true'})
    await fireEvent.click(button)

    expect(button).toHaveTextContent('false')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should render portal children in the document and item as an empty primitive', () => {
    render(() => (
      <>
        <HSelectPortal>
          <span>portal content</span>
        </HSelectPortal>
        <HSelectItem />
      </>
    ))

    expect(screen.getByText('portal content')).toBeInTheDocument()
  })
})
