/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {FaceControls} from '../FaceControls'
import {FACE_CONTROLS, type FaceSettings} from '../face-deformation'

describe('FaceControls', () => {
  it('should expose all nineteen sliders and restore their original values', () => {
    const [value, setValue] = createSignal<FaceSettings>({})
    render(() => <FaceControls value={value()} onChange={setValue} />)
    expect(screen.getAllByRole('slider')).toHaveLength(19)
    for (const control of FACE_CONTROLS) {
      const slider = screen.getByRole('slider', {name: control.label})
      expect(slider).toHaveAttribute('min', String(control.min))
      fireEvent.input(slider, {target: {value: '1'}})
      expect(value()[control.id]).toBe(1)
    }
    fireEvent.click(screen.getByRole('button', {name: '얼굴 변형 초기화'}))
    expect(value()).toEqual({})
    expect(screen.getByRole('slider', {name: '뺨 높이 조정'})).toHaveValue('-0.15')
    expect(screen.getByRole('slider', {name: '턱 끝 위아래 조정'})).toHaveValue('0.449')
    expect(screen.getByRole('slider', {name: '턱 줄이기'})).toHaveValue('0.568')
    expect(screen.getByRole('slider', {name: '얼굴 모양(여성)'})).toHaveValue('1')
  })
})
