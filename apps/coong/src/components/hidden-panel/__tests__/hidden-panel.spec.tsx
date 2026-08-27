/** @vitest-environment jsdom */

import {fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {Tab} from '../../tab'
import {SClose} from '../SClose'
import {SHiddenContent} from '../SHiddenContent'
import {SHiddenPanelProvider} from '../SHiddenPanelProvider'
import {SPlayerPanelBody} from '../SPlayerPanelBody'
import {SPlayerPanel} from '../SPlayerPanel'
import {STabButton} from '../STabButton'
import {STabList} from '../STabList'
import {useWindowSize} from '../window-size'
import {STopLevelPanel} from '../STopLevelPanel'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hidden panel state', () => {
  it('should toggle visible content from the close control', async () => {
    render(() => (
      <SHiddenPanelProvider initShow>
        <SClose playedTime={5} totalTime={10} />
        <SHiddenContent>panel content</SHiddenContent>
      </SHiddenPanelProvider>
    ))

    expect(screen.getByText('panel content')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('panel content')).not.toBeInTheDocument()
  })

  it('should render tab controls only while the panel is open', async () => {
    render(() => (
      <SHiddenPanelProvider initShow>
        <Tab.Provider activeTab="player">
          <STabList data-testid="tabs">
            <STabButton value="player">Player</STabButton>
          </STabList>
        </Tab.Provider>
      </SHiddenPanelProvider>
    ))

    expect(screen.getByTestId('tabs')).toHaveAttribute('role', 'tablist')
    expect(screen.getByRole('tab', {name: 'Player'})).toHaveClass('bg-white')
  })
})

describe('hidden panel layout', () => {
  it('should render resizable panel content and its upper handle', () => {
    render(() => (
      <SPlayerPanelBody data-testid="panel" maxPercent={0.5} isActive>
        player body
      </SPlayerPanelBody>
    ))

    expect(screen.getByTestId('panel')).toHaveTextContent('player body')
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1')
  })

  it('should initialize the component-local size from the browser window', () => {
    const view = renderHook(() => useWindowSize({height: 100, width: 200}))

    expect(view.result()).toEqual({height: window.innerHeight, width: window.innerWidth})
  })

  it('should compose the player panel and top-level panel shells', () => {
    render(() => (
      <>
        <SPlayerPanel data-testid="player-panel" />
        <STopLevelPanel />
      </>
    ))

    expect(screen.getByTestId('player-panel')).toBeInTheDocument()
    expect(screen.getAllByTitle('play').length).toBeGreaterThan(0)
  })
})
