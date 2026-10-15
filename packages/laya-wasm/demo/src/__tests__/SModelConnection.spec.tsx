/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SModelConnection} from '../SModelConnection'
import type {Phase} from '../types'

afterEach(cleanup)

const createConnection = () => {
  const [phase, setPhase] = createSignal<Phase>('idle')
  return {
    lab: {
      busy: () => phase() === 'loading',
      disconnect: vi.fn(() => setPhase('idle')),
      load: vi.fn(),
      loaded: () => phase() === 'ready',
      phase,
      reportError: vi.fn(),
    },
    setPhase,
  }
}

it('should default to multilingual and load the chosen model without a path input', () => {
  const {lab} = createConnection()
  render(() => <SModelConnection lab={lab} />)
  expect(screen.getByRole('radio', {name: '다국어'})).toHaveProperty('checked', true)
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '모델 불러오기'}))
  expect(lab.load).toHaveBeenLastCalledWith('/models/laya-multilingual/')
  fireEvent.click(screen.getByRole('radio', {name: '영문'}))
  expect(screen.getByRole('radio', {name: '영문'})).toHaveProperty('checked', true)
  fireEvent.click(screen.getByRole('button', {name: '모델 불러오기'}))
  expect(lab.load).toHaveBeenLastCalledWith('/models/laya/')
})

it('should lock model selection while connected or loading and unlock after disconnect', () => {
  const {lab, setPhase} = createConnection()
  render(() => <SModelConnection lab={lab} />)
  setPhase('loading')
  expect(screen.getByRole('radio', {name: '영문'})).toHaveProperty('disabled', true)
  expect(screen.getByRole('button', {name: '모델 불러오기'})).toHaveProperty('disabled', true)
  setPhase('ready')
  expect(screen.getByRole('radio', {name: '영문'})).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', {name: '연결 해제'}))
  expect(lab.disconnect).toHaveBeenCalledOnce()
  expect(screen.getByRole('radio', {name: '영문'})).toHaveProperty('disabled', false)
})

it('should surface model load errors', () => {
  const {lab} = createConnection()
  const error = new Error('Unavailable')
  lab.load.mockImplementation(() => {
    throw error
  })
  render(() => <SModelConnection lab={lab} />)
  fireEvent.click(screen.getByRole('button', {name: '모델 불러오기'}))
  expect(lab.reportError).toHaveBeenCalledWith(error)
})
