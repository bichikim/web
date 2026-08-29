/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {ModelStorageManager} from 'src/features/model-storage'
import {failureResult, successResult} from 'src/features/result'
import StoragePage from '../StoragePage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

it('should confirm, delete a cache entry, and refresh the snapshot', async () => {
  const manager = createManager()
  render(() => <StoragePage manager={manager} />)

  const deleteButton = await screen.findByRole('button', {name: 'model.onnx 삭제'})
  fireEvent.click(deleteButton)
  fireEvent.click(screen.getByRole('button', {name: '삭제 확정'}))

  await waitFor(() =>
    expect(manager.deleteCacheEntry).toHaveBeenCalledWith(
      'https://models.test/repository/model.onnx',
    ),
  )
  await waitFor(() => expect(manager.inspect).toHaveBeenCalledTimes(2))
})

it('should preserve data when deletion confirmation is cancelled', async () => {
  const manager = createManager()
  render(() => <StoragePage manager={manager} />)

  fireEvent.click(await screen.findByRole('button', {name: 'model.onnx 삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  expect(manager.deleteCacheEntry).not.toHaveBeenCalled()
})

it('should report inspection failures', async () => {
  const manager = createManager()
  vi.mocked(manager.inspect).mockResolvedValue(
    failureResult({cause: new Error('blocked'), operation: 'inspect'}),
  )
  render(() => <StoragePage manager={manager} />)

  expect(await screen.findByRole('alert')).toHaveTextContent('모델 저장소를 읽지 못했어요.')
})
