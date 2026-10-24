/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SContextAttachments} from '../SContextAttachments'
import type {ViewerPort} from '../types'

afterEach(cleanup)

it('should remove one attachment, clear all, and unsubscribe on unmount', async () => {
  let publish: (contexts: readonly string[] | null) => void = () => undefined
  const unsubscribe = vi.fn()
  const removeContext = vi.fn().mockResolvedValue(undefined)
  const port = {
    removeContext,
    subscribeContext: (receive) => {
      publish = receive
      return unsubscribe
    },
  } satisfies Pick<ViewerPort, 'subscribeContext' | 'removeContext'>
  const rendered = render(() => <SContextAttachments port={port} onError={vi.fn()} />)
  expect(screen.queryByText(/첨부할 내용/u)).toBeNull()
  publish(['first.ts\nsource', 'second.ts\nsource'])
  expect(screen.getByText('첨부할 내용 2개')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button', {hidden: true, name: '제거'})[1])
  expect(removeContext).toHaveBeenCalledWith(1)
  await Promise.resolve()
  await Promise.resolve()
  fireEvent.click(screen.getByRole('button', {hidden: true, name: '첨부 비우기'}))
  expect(removeContext).toHaveBeenLastCalledWith(undefined)
  rendered.unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
})

it('should copy pending snapshots for native Claude paste without consuming them', async () => {
  const copyContextFiles = vi.fn().mockResolvedValue(undefined)
  const removeContext = vi.fn()
  const onNotice = vi.fn()
  const port = {
    copyContextFiles,
    removeContext,
    subscribeContext: (receive) => {
      receive(['unsaved snapshot'])
      return () => undefined
    },
  } satisfies Pick<ViewerPort, 'copyContextFiles' | 'subscribeContext' | 'removeContext'>
  render(() => <SContextAttachments port={port} onError={vi.fn()} onNotice={onNotice} />)
  fireEvent.click(screen.getByRole('button', {hidden: true, name: 'Claude 첨부로 복사'}))
  await Promise.resolve()
  expect(copyContextFiles).toHaveBeenCalledOnce()
  expect(removeContext).not.toHaveBeenCalled()
  expect(onNotice).toHaveBeenCalledWith('Claude 입력창에서 Cmd+V로 붙여넣으세요.')
})

it('should report a copy failure without claiming a native attachment was created', async () => {
  const error = new Error('clipboard rejected')
  const onError = vi.fn()
  const onNotice = vi.fn()
  const port = {
    copyContextFiles: vi.fn().mockRejectedValue(error),
    subscribeContext: (receive) => {
      receive(['retained snapshot'])
      return () => undefined
    },
  } satisfies Pick<ViewerPort, 'copyContextFiles' | 'subscribeContext'>
  render(() => <SContextAttachments port={port} onError={onError} onNotice={onNotice} />)
  fireEvent.click(screen.getByRole('button', {hidden: true, name: 'Claude 첨부로 복사'}))
  await Promise.resolve()
  expect(onError).toHaveBeenCalledWith(error)
  expect(onNotice).not.toHaveBeenCalled()
})

it('should attach with one click, retain staged snapshots and prevent duplicate clicks while pending', async () => {
  const completed = Promise.withResolvers<void>()
  const attachContextFiles = vi.fn(() => completed.promise)
  const copyContextFiles = vi.fn()
  const removeContext = vi.fn()
  const port = {
    attachContextFiles,
    copyContextFiles,
    removeContext,
    subscribeContext: (receive) => {
      receive(['unsaved native snapshot'])
      return () => undefined
    },
  } satisfies Pick<
    ViewerPort,
    'attachContextFiles' | 'copyContextFiles' | 'removeContext' | 'subscribeContext'
  >
  const onError = vi.fn()
  render(() => <SContextAttachments port={port} onError={onError} />)
  const button = screen.getByRole('button', {hidden: true, name: 'Claude에 첨부'})
  fireEvent.click(button)
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(attachContextFiles).toHaveBeenCalledOnce()
  completed.resolve()
  await completed.promise
  expect(button).not.toBeDisabled()
  expect(screen.getByText('첨부할 내용 1개')).toBeTruthy()
  expect(copyContextFiles).not.toHaveBeenCalled()
  expect(removeContext).not.toHaveBeenCalled()
  expect(onError).not.toHaveBeenCalled()
})

it('should retain the selection and report a native attachment failure', async () => {
  const error = new Error('permission required')
  const onError = vi.fn()
  const port = {
    attachContextFiles: vi.fn().mockRejectedValue(error),
    subscribeContext: (receive) => {
      receive(['retained'])
      return () => undefined
    },
  } satisfies Pick<ViewerPort, 'attachContextFiles' | 'subscribeContext'>
  render(() => <SContextAttachments port={port} onError={onError} />)
  fireEvent.click(screen.getByRole('button', {hidden: true, name: 'Claude에 첨부'}))
  await Promise.resolve()
  expect(onError).toHaveBeenCalledWith(error)
  expect(screen.getByText('첨부할 내용 1개')).toBeTruthy()
})
