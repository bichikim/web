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
      maskTargetOptions={[]}
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
  const [targets, setTargets] = createSignal([
    {...createPart('mask-a'), properties: {clippingMaskIds: ['part']}},
    {...createPart('mask-b'), properties: {clippingMaskIds: [] as string[]}},
  ])
  render(() => (
    <PartProperties
      maskTargetOptions={targets().map((target, index) => ({
        disabled: false,
        label: index === 0 ? 'Mask A' : 'Mask B',
        part: target,
      }))}
      part={part}
      staticDisabled={false}
      visualDisabled={false}
      onInterpolatedChange={vi.fn()}
      onStaticChange={vi.fn()}
      onMaskTargetChange={(id, checked) =>
        setTargets((current) =>
          current.map((target) =>
            target.id === id
              ? {...target, properties: {clippingMaskIds: checked ? ['part'] : []}}
              : target,
          ),
        )
      }
    />
  ))

  expect(screen.getByRole('button', {name: 'Mask A 적용 해제'})).toBeVisible()
  expect(screen.queryByRole('checkbox', {name: 'Mask B에 마스크 적용'})).toBeNull()

  fireEvent.click(screen.getByRole('button', {name: '대상 추가'}))

  const picker = screen.getByRole('dialog', {name: '대상 추가'})
  fireEvent.input(within(picker).getByRole('searchbox', {name: '적용 대상 검색'}), {
    target: {value: 'mask b'},
  })
  expect(within(picker).queryByRole('checkbox', {name: 'Mask A에 마스크 적용'})).toBeNull()
  fireEvent.click(within(picker).getByRole('checkbox', {name: 'Mask B에 마스크 적용'}))

  expect(screen.getByRole('button', {name: 'Mask B 적용 해제'})).toBeVisible()
  expect(screen.getByText('2개 적용')).toBeVisible()
})

test('should expose layer mask picking and group source behavior separately', () => {
  const onMaskPickCancel = vi.fn()
  const onMaskPickStart = vi.fn()
  const view = render(() => (
    <PartProperties
      maskTargetOptions={[]}
      part={part}
      staticDisabled={false}
      visualDisabled={false}
      onInterpolatedChange={vi.fn()}
      onMaskPickCancel={onMaskPickCancel}
      onMaskPickStart={onMaskPickStart}
      onStaticChange={vi.fn()}
    />
  ))

  fireEvent.click(view.getByRole('button', {name: '레이어에서 선택'}))
  expect(onMaskPickStart).toHaveBeenCalledWith('part')
  const sourceFieldset = view.getByRole('group', {name: '마스크 적용 대상'})
  expect(within(sourceFieldset).getByRole('checkbox', {name: '마스크 반전'})).toBeVisible()

  view.unmount()
  render(() => (
    <PartProperties
      maskTargetOptions={[]}
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
  fireEvent.click(screen.getByRole('button', {name: '대상 선택 취소'}))
  expect(onMaskPickCancel).toHaveBeenCalledOnce()
})
