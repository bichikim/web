/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformPanel} from '../EditorKeyformPanel'

describe('EditorKeyformPanel', () => {
  test('should select, add, and delete parameter keyforms explicitly', () => {
    const onKeyformAdd = vi.fn()
    const onKeyformDelete = vi.fn()
    const onKeyformSelect = vi.fn()
    const onParameterNameChange = vi.fn()
    const parameters = createDemoDocument().parameters ?? []
    const view = render(() => (
      <EditorKeyformPanel
        activeKeyformValue={0}
        activeParameterId="angle-x"
        parameters={parameters}
        value={0}
        onKeyformAdd={onKeyformAdd}
        onKeyformDelete={onKeyformDelete}
        onKeyformSelect={onKeyformSelect}
        onParameterNameChange={onParameterNameChange}
      />
    ))

    expect(view.getAllByRole('button', {name: /^Angle X .* 키폼$/})).toHaveLength(3)
    expect(view.getByRole('button', {name: 'Angle X 0 키폼'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(view.getAllByText('Angle X')).toHaveLength(1)
    expect(view.container.querySelectorAll('.keyform-track-label')).toHaveLength(1)

    fireEvent.click(view.getByRole('button', {name: 'Angle X 30 키폼'}))
    fireEvent.click(view.getByRole('button', {name: 'Angle X'}), {timeStamp: 100})
    fireEvent.click(view.getByRole('button', {name: 'Angle X'}), {timeStamp: 200})
    fireEvent.input(view.getByRole('textbox', {name: 'Parameter 이름'}), {
      target: {value: 'Face Angle'},
    })
    fireEvent.keyDown(view.getByRole('textbox', {name: 'Parameter 이름'}), {key: 'Enter'})
    fireEvent.click(view.getByRole('button', {name: '+ 현재 값에 키폼'}))
    fireEvent.click(view.getByRole('button', {name: '선택 키폼 삭제'}))

    expect(onKeyformSelect).toHaveBeenCalledWith('angle-x', 30)
    expect(onParameterNameChange).toHaveBeenCalledWith('angle-x', 'Face Angle')
    expect(onKeyformAdd).toHaveBeenCalledOnce()
    expect(onKeyformDelete).toHaveBeenCalledOnce()
  })

  test('should update the current parameter value while dragging its indicator', () => {
    const onValueChange = vi.fn()
    const parameters = createDemoDocument().parameters ?? []
    const view = render(() => (
      <EditorKeyformPanel
        activeParameterId="angle-x"
        parameters={parameters}
        value={0}
        onValueChange={onValueChange}
      />
    ))
    const track = view.getByLabelText('Angle X 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const indicator = view.getByRole('slider', {name: 'Angle X 현재 값'})

    indicator.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 400}))
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 550}))
    expect(onValueChange).toHaveBeenLastCalledWith(15)
    window.dispatchEvent(new MouseEvent('pointerup'))
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 650}))
    expect(onValueChange).toHaveBeenLastCalledWith(15)
  })
})
