/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import type {PuppetParameterInfluence} from '../../../player/document'
import {createDemoDocument} from '../../../player'
import {type DocumentHistoryResult, useDocumentHistory} from '../../use-document-history'
import {setParameterInfluences} from '../parameter-influences'
import {InfluenceEditor} from '../InfluenceEditor'

test('should edit influences inline and open custom points only in a popover', async () => {
  const [influences, setInfluences] = createSignal<ReadonlyArray<PuppetParameterInfluence>>([])
  const change = vi.fn((value: ReadonlyArray<PuppetParameterInfluence>) => {
    setInfluences(value)
    return true
  })
  render(() => (
    <InfluenceEditor
      parameters={[{defaultValue: 0, id: 'control', maximum: 10, minimum: -10, name: 'Control'}]}
      influences={influences()}
      onChange={change}
    />
  ))
  expect(screen.queryByRole('button', {name: '영향도 설정'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '기준 추가'}))
  expect(influences()).toHaveLength(1)
  fireEvent.click(screen.getByRole('radio', {name: '중간에서 최대'}))
  expect(influences()[0]?.points).toEqual([
    {value: -10, weight: 0},
    {value: 0, weight: 1},
    {value: 10, weight: 0},
  ])
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '직접 설정 1'}))
  expect(screen.getByRole('dialog', {name: '커스텀 곡선'})).toBeVisible()
  fireEvent.input(screen.getByRole('spinbutton', {name: '관계 1 영향도 2'}), {
    target: {value: '40'},
  })
  expect(influences()[0]?.points[1]?.weight).toBe(0.4)
  const valid = influences()
  fireEvent.input(screen.getByRole('spinbutton', {name: '관계 1 입력값 2'}), {
    target: {value: '-10'},
  })
  expect(influences()).toBe(valid)
  fireEvent.blur(screen.getByRole('spinbutton', {name: '관계 1 입력값 2'}))
  fireEvent.click(screen.getByRole('button', {name: '커스텀 곡선 닫기'}))
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed'))
  fireEvent.click(screen.getByRole('button', {name: '직접 설정 1'}))
  expect(screen.getByRole('spinbutton', {name: '관계 1 입력값 2'})).toHaveValue(0)
})

test('should group a slider gesture into one undo and update the inline controls on undo', () => {
  let history!: DocumentHistoryResult
  const initial = createDemoDocument()
  const binding = initial.parameterBindings![0]!
  render(() => {
    history = useDocumentHistory({initialDocument: initial})
    return (
      <InfluenceEditor
        parameters={initial.parameters!}
        influences={history.document().parameterBindings![0]!.influences}
        onEditStart={history.beginTransaction}
        onEditEnd={history.endTransaction}
        onChange={(influences) => {
          const next = setParameterInfluences({
            bindingId: binding.id,
            document: history.document(),
            influences,
          })
          if (next === undefined) {
            return false
          }
          history.setDocument(next)
          return true
        }}
      />
    )
  })
  fireEvent.click(screen.getByRole('button', {name: '기준 추가'}))
  expect(history.undoCount()).toBe(1)
  const slider = screen.getByRole('slider', {name: '최대 적용량 1'})
  fireEvent.pointerDown(slider, {pointerId: 1})
  fireEvent.input(slider, {target: {value: '80'}})
  fireEvent.input(slider, {target: {value: '60'}})
  fireEvent.pointerUp(slider, {pointerId: 1})
  expect(history.undoCount()).toBe(2)
  expect(history.undo()).toBe(true)
  expect(slider).toHaveValue('100')
  expect(history.redo()).toBe(true)
  expect(slider).toHaveValue('60')
  fireEvent.click(screen.getByRole('radio', {name: '중간에서 최대'}))
  expect(screen.getByRole('radio', {name: '중간에서 최대'})).toBeChecked()
  history.undo()
  expect(screen.getByRole('radio', {name: '약하게'})).toBeChecked()
})

test('should collapse controls and the custom popover without changing saved influences', async () => {
  const influences = [
    {
      parameterId: 'control',
      points: [
        {value: -10, weight: 1},
        {value: 10, weight: 0},
      ],
    },
  ]
  const change = vi.fn(() => true)
  render(() => (
    <>
      <style>{'.influence-drawer { animation-name: none; }'}</style>
      <InfluenceEditor
        parameters={[{defaultValue: 0, id: 'control', maximum: 10, minimum: -10, name: 'Control'}]}
        influences={influences}
        onChange={change}
      />
    </>
  ))
  fireEvent.click(screen.getByRole('button', {name: '직접 설정 1'}))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  const toggle = screen.getByRole('button', {name: '영향도'})
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const animationEnd = new Event('animationend', {bubbles: true})
  Object.defineProperty(animationEnd, 'animationName', {value: ''})
  screen
    .getByRole('button', {name: '기준 추가'})
    .closest('.influence-drawer')!
    .dispatchEvent(animationEnd)
  await waitFor(() =>
    expect(screen.queryByRole('button', {name: '기준 추가'})).not.toBeInTheDocument(),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('slider', {name: '최대 적용량 1'})).toHaveValue('100')
  expect(change).not.toHaveBeenCalled()
})
