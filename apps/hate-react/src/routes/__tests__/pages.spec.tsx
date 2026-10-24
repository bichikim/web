/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {Icon} from '@iconify-icon/solid'
import {Title} from '@solidjs/meta'
import {afterEach, describe, expect, it, vi} from 'vitest'
import HomePage from '../index'
import NotFound from '../[...404]'
import {useOpinionCycle} from '../../use/use-opinion-cycle'
import {useSupporters} from '../../use/use-supporters'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@iconify-icon/solid', () => ({Icon: vi.fn()}))
vi.mock('../../use/use-opinion-cycle', () => ({useOpinionCycle: vi.fn()}))
vi.mock('../../use/use-supporters', () => ({useSupporters: vi.fn()}))

describe('routes', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the home construction notice and current opinion', () => {
    vi.mocked(Title).mockReturnValue(null)
    vi.mocked(Icon).mockReturnValue(<span>Construction icon</span>)
    vi.mocked(useSupporters).mockReturnValue((() => ['First opinion']) as never)
    vi.mocked(useOpinionCycle).mockReturnValue({
      currentMessage: () => 'First opinion',
      goToNext: vi.fn(),
      messagesList: () => ['First opinion'],
    })

    const view = render(() => <HomePage />)

    expect(view.getByText('Under construction.')).toBeDefined()
    expect(view.getByText('First opinion')).toBeDefined()
    expect(view.getAllByRole('link')).toHaveLength(2)
  })

  it('should render the not-found route', () => {
    const view = render(() => <NotFound />)

    expect(view.getByRole('main').textContent).toBe('404')
  })
})
