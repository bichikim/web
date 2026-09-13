/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {PsdSourceSelect} from '../PsdSourceSelect'
import type {PsdReimportPlan} from '../psd-reimport'

test('should require a source choice and display its name after selection', async () => {
  const document = createDemoDocument()
  const [plan, setPlan] = createSignal<PsdReimportPlan>({
    document,
    incoming: document,
    mapping: new Map(),
    rows: [],
    sources: [
      {id: 'first', name: '첫 번째 모델', parts: []},
      {id: 'second', name: '두 번째 모델', parts: []},
    ],
    viewportChanged: false,
  })
  render(() => (
    <PsdSourceSelect plan={plan()} onChange={(sourceId) => setPlan({...plan(), sourceId})} />
  ))
  const trigger = screen.getByRole('button', {name: '갱신할 PSD 원본'})
  expect(screen.getByText(/갱신할 원본을 선택하세요/)).toBeVisible()
  fireEvent.keyDown(trigger, {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '두 번째 모델'}))
  expect(plan().sourceId).toBe('second')
  expect(trigger).toHaveTextContent('두 번째 모델')
  expect(screen.queryByText(/갱신할 원본을 선택하세요/)).not.toBeInTheDocument()
  setPlan({...plan(), sources: plan().sources.slice(1)})
  expect(screen.queryByRole('button', {name: '갱신할 PSD 원본'})).not.toBeInTheDocument()
})
