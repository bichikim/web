/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, describe, expect, test, vi} from 'vitest'

import type {Player} from '../../player'
import {PuppetEditor} from '../PuppetEditor'

const mocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
}))
const player: Player = {
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  seek: vi.fn(),
  updateDocument: vi.fn(() => true),
}

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('PuppetEditor', () => {
  test('should render the editor workspace and initialize its player', async () => {
    mocks.createPlayer.mockResolvedValue(player)

    const view = render(() => <PuppetEditor />)

    expect(view.getByRole('heading', {name: '저장 데이터 플레이어 미리보기'})).toBeVisible()
    expect(view.getByText('Static mesh')).toBeVisible()
    expect(view.getByRole('button', {name: 'JSON 내보내기'})).toBeVisible()
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
  })
})
