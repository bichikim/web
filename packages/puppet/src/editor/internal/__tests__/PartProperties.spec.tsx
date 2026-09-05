/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import type {PuppetPart} from '../../../player'
import {PartProperties} from '../PartProperties'

const part: PuppetPart = {
  id: 'part',
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
  texture: {height: 1, src: 'part.png', width: 1},
}

const createPart = (id: string): PuppetPart => ({
  ...part,
  id,
  texture: {...part.texture, src: `${id}.png`},
})

test('should disable only visual rendering inputs when visual editing is disabled', () => {
  render(() => (
    <PartProperties
      maskPartOptions={[]}
      part={part}
      staticDisabled={false}
      visualDisabled={true}
      onInterpolatedChange={vi.fn()}
      onStaticChange={vi.fn()}
    />
  ))

  expect(screen.getByLabelText('파트 불투명도')).toBeDisabled()
  expect(screen.getByLabelText('파트 곱하기 색상')).toBeDisabled()
  expect(screen.getByLabelText('파트 스크린 색상')).toBeDisabled()
  expect(screen.getByLabelText('파트 블렌드 모드')).toBeEnabled()
})

test('should show selected masks as chips and open searchable mask choices on demand', () => {
  const maskA = createPart('mask-a')
  const maskB = createPart('mask-b')
  const [selectedPart, setSelectedPart] = createSignal<PuppetPart>({
    ...part,
    properties: {clippingMaskIds: ['mask-a']},
  })
  render(() => (
    <PartProperties
      maskPartOptions={[
        {disabled: false, label: 'Mask A', part: maskA},
        {disabled: false, label: 'Mask B', part: maskB},
      ]}
      part={selectedPart()}
      staticDisabled={false}
      visualDisabled={false}
      onInterpolatedChange={vi.fn()}
      onStaticChange={(properties) =>
        setSelectedPart((current) => ({
          ...current,
          properties: {...current.properties, ...properties},
        }))
      }
    />
  ))

  expect(screen.getByRole('button', {name: 'Mask A 마스크 제거'})).toBeVisible()
  expect(screen.queryByRole('checkbox', {name: 'Mask B로 자르기'})).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: '마스크 추가'}))

  const picker = screen.getByRole('dialog', {name: '마스크 추가'})
  fireEvent.input(within(picker).getByRole('searchbox', {name: '마스크 검색'}), {
    target: {value: 'mask b'},
  })
  expect(within(picker).queryByRole('checkbox', {name: 'Mask A로 자르기'})).toBeNull()
  fireEvent.click(within(picker).getByRole('checkbox', {name: 'Mask B로 자르기'}))

  expect(screen.getByRole('button', {name: 'Mask B 마스크 제거'})).toBeVisible()
  expect(screen.getByText('2개 적용')).toBeVisible()
})

test('should expose layer mask picking and group source behavior separately', () => {
  const onMaskPickCancel = vi.fn()
  const onMaskPickStart = vi.fn()
  const view = render(() => (
    <PartProperties
      maskPartOptions={[]}
      maskUsageCount={2}
      part={part}
      staticDisabled={false}
      visualDisabled={false}
      onInterpolatedChange={vi.fn()}
      onMaskPickCancel={onMaskPickCancel}
      onMaskPickStart={onMaskPickStart}
      onStaticChange={vi.fn()}
    />
  ))

  fireEvent.click(view.getByRole('button', {name: '레이어에서 마스크 선택'}))
  expect(onMaskPickStart).toHaveBeenCalledWith('part')
  const sourceFieldset = view.getByRole('group', {name: '이 파트를 마스크로 사용할 때'})
  expect(within(sourceFieldset).getByText('2개 파츠에서 사용 중')).toBeVisible()
  expect(within(sourceFieldset).getByRole('checkbox', {name: '마스크 반전'})).toBeVisible()

  view.unmount()
  render(() => (
    <PartProperties
      maskPartOptions={[]}
      maskPicking={true}
      part={part}
      staticDisabled={false}
      visualDisabled={false}
      onInterpolatedChange={vi.fn()}
      onMaskPickCancel={onMaskPickCancel}
      onMaskPickStart={onMaskPickStart}
      onStaticChange={vi.fn()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '마스크 선택 취소'}))
  expect(onMaskPickCancel).toHaveBeenCalledOnce()
})
