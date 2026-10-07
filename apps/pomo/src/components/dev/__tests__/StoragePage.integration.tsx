/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import {type ModelDownloadState, useModelDownload} from 'src/features/model-download'
import type {ModelStorageManager} from 'src/features/model-storage'
import {successResult} from 'src/features/result'
import {StoragePage} from '../StoragePage'
import {DeletionModal} from '../storage/DeletionModal'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../storage/DeletionModal', async (importOriginal) => {
  const original = await importOriginal<typeof import('../storage/DeletionModal')>()
  return {DeletionModal: vi.fn(original.DeletionModal)}
})

const createManager = (): ModelStorageManager => ({
  clearCache: vi.fn(async () => successResult(true)),
  clearPartialDownloads: vi.fn(async () => successResult(true)),
  deleteCacheEntry: vi.fn(async () => successResult(true)),
  inspect: vi.fn(async () =>
    successResult({
      cacheEntries: ['https://models.test/repository/model.onnx'],
      partialFileCount: 2,
      partialStorageAvailable: true,
    }),
  ),
})

beforeEach(() => {
  const [downloadState] = createSignal<ModelDownloadState>({status: 'idle'})
  vi.mocked(useModelDownload).mockReturnValue({state: downloadState} as ReturnType<
    typeof useModelDownload
  >)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should show stored model data and verification destinations', async () => {
  render(() => <StoragePage manager={createManager()} />)

  expect(await screen.findByText('model.onnx')).toBeDefined()
  expect(screen.getByText('2개 파일이 남아 있어요.')).toBeDefined()
  expect(screen.getByRole('link', {name: '문장 만들기 →'}).getAttribute('href')).toBe(
    '/dev/dialogue',
  )
  expect(screen.getByRole('link', {name: '음성 생성 →'}).getAttribute('href')).toBe('/dev/voice')
})
