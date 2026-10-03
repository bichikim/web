/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {clientOnly} from '@solidjs/start'
import {type Component, lazy, Show} from 'solid-js'
import {afterEach, beforeAll, expect, it, vi} from 'vitest'
import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PRelaxPlayerPage} from 'src/components/p-relax-player-page/PRelaxPlayerPage'

vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))
vi.mock('src/components/apps-in-toss-prepare', () => ({AppsInTossPrepare: vi.fn()}))
vi.mock('src/components/p-relax-player-page/PRelaxPlayerPage', () => ({PRelaxPlayerPage: vi.fn()}))

let RelaxPage: Component

beforeAll(async () => {
  vi.mocked(clientOnly).mockImplementation((loader) => lazy(loader))
  vi.mocked(AppsInTossPrepare).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(PRelaxPlayerPage).mockImplementation((props) => (
    <>
      <p>Relax player</p>
      <Show when={props.returnHref}>{(href) => <a href={href()}>Return to Pomo</a>}</Show>
    </>
  ))
  RelaxPage = (await import('../relax')).default
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

it.each(['', 'true'])(
  'should retain integrated Pomo navigation with Apps in Toss=%s',
  async (toss) => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', toss)
    vi.stubEnv('VITE_APP_LAYOUT', '')
    vi.stubEnv('VITE_POMO_STANDALONE_RELAX', '')

    render(() => <RelaxPage />)

    expect(await screen.findByRole('link', {name: 'Return to Pomo'})).toHaveAttribute(
      'href',
      '/?layout=all-in-one',
    )
  },
)

it.each([
  ['relax-player', '', ''],
  ['relax-player', '', 'true'],
  ['', 'true', ''],
  ['relax-player', 'true', ''],
])(
  'should omit integrated return navigation for layout=%s standalone=%s toss=%s',
  async (layout, standalone, toss) => {
    vi.stubEnv('VITE_APP_LAYOUT', layout)
    vi.stubEnv('VITE_POMO_STANDALONE_RELAX', standalone)
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', toss)

    render(() => <RelaxPage />)

    expect(await screen.findByText('Relax player')).toBeInTheDocument()
    expect(screen.queryByRole('link', {name: 'Return to Pomo'})).not.toBeInTheDocument()
  },
)
