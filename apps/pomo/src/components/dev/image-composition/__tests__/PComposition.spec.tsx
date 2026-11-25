/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {PComposition} from '../PComposition'
import scene from '../composition.json'

afterEach(cleanup)

it('should follow the hand while keeping its shadow independently adjustable and clipped to the neck', () => {
  const neck = {
    id: 'neck',
    label: '목',
    opacity: 100,
    rotation: 0,
    scaleX: 30,
    scaleY: 50,
    visible: true,
    x: 44,
    y: 3,
  }
  const hand = {...neck, id: 'hand', label: '손', x: 20, y: 15}
  const shadow = {
    ...neck,
    clipTo: neck.id,
    follows: hand.id,
    id: 'hand-shadow',
    label: '손 그림자',
    multiply: true,
  }
  render(() => <PComposition initialParts={[neck, shadow, hand]} />)
  const image = screen.getByRole('img', {name: '손 그림자 파트'})
  fireEvent.click(screen.getByRole('button', {name: '손 선택'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {
    target: {value: '21'},
  })
  expect(image.parentElement?.style.getPropertyValue('--control-transform')).toContain(
    'translate(21%, 15%)',
  )
  expect(image.parentElement?.parentElement?.style.getPropertyValue('--part-mask')).toMatch(
    /-part-mask-neck\)$/,
  )
  expect(screen.getByRole('img', {name: '목 파트'}).style.getPropertyValue('--part-x')).toBe('44%')
  fireEvent.click(screen.getByRole('checkbox', {name: '손 표시'}))
  expect(image).not.toBeVisible()
  fireEvent.click(screen.getByRole('checkbox', {name: '손 표시'}))
  fireEvent.click(screen.getByRole('button', {name: '손 그림자 선택'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {
    target: {value: '45'},
  })
  expect(image.style.getPropertyValue('--part-x')).toBe('45%')
  fireEvent.click(screen.getByRole('checkbox', {name: '손 그림자 표시'}))
  expect(image).not.toBeVisible()
  expect(screen.getByRole('img', {name: '손 파트'})).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '선택만 표시'}))
  expect(screen.getByRole('img', {name: '손 그림자 파트'})).toBeVisible()
  expect(screen.getByAltText('손 파트')).not.toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '모두 표시'}))
  fireEvent.click(screen.getByRole('checkbox', {name: '손 표시'}))
  expect(screen.getByAltText('손 그림자 파트')).not.toBeVisible()
})

it('should move a shared cast shadow while keeping each receiver mask stationary', () => {
  const skin = {
    id: 'skin',
    label: '피부',
    opacity: 100,
    rotation: 0,
    scaleX: 30,
    scaleY: 50,
    visible: true,
    x: 44,
    y: 3,
  }
  const strap = {...skin, id: 'strap', label: '옷끈', x: 60}
  const cast = {...skin, clipTo: 'skin', id: 'head-shadow', label: '공유 그림자', multiply: true}
  const attached = {
    ...cast,
    clipTo: 'strap',
    controlledBy: cast.id,
    id: 'strap-shadow',
    label: '끈 그림자',
  }
  render(() => <PComposition initialParts={[skin, cast, strap, attached]} />)
  const image = screen.getByRole('img', {name: '끈 그림자 파트'})
  const motion = image.parentElement
  const mask = motion?.parentElement
  expect(mask?.style.getPropertyValue('--part-mask')).toMatch(/-part-mask-strap\)$/)
  expect(mask).not.toHaveClass('[transform:var(--control-transform)]')
  expect(motion).toHaveClass('[transform:var(--control-transform)]')
  fireEvent.click(screen.getByRole('button', {name: '공유 그림자 선택'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {target: {value: '45'}})
  expect(motion?.style.getPropertyValue('--control-transform')).toContain('translate(45%, 3%)')
  expect(mask?.style.getPropertyValue('--part-mask')).toMatch(/-part-mask-strap\)$/)
  expect(screen.getByRole('img', {name: '옷끈 파트'}).style.getPropertyValue('--part-x')).toBe(
    '60%',
  )
  fireEvent.click(screen.getByRole('checkbox', {name: '공유 그림자 표시'}))
  expect(image).not.toBeVisible()
  expect(screen.getByRole('img', {name: '옷끈 파트'})).toBeVisible()
})

it('should clip a movable multiply shadow to its receiver without altering the receiver', () => {
  const face = {
    id: 'skin',
    label: '얼굴',
    opacity: 100,
    rotation: 0,
    scaleX: 30,
    scaleY: 50,
    visible: true,
    x: 44,
    y: 3,
  }
  const shadow = {
    ...face,
    clipTo: 'skin',
    id: 'hair-shadow-face',
    label: '머리 그림자',
    multiply: true,
  }
  render(() => <PComposition initialParts={[face, shadow]} />)
  const receiver = screen.getByRole('img', {name: '얼굴 파트'})
  const overlay = screen.getByRole('img', {name: '머리 그림자 파트'})
  expect(screen.getByRole('region', {name: '이미지 조합 작업영역'})).toHaveClass('isolate')
  expect(overlay.parentElement?.parentElement).toHaveClass('mix-blend-multiply')
  expect(receiver.parentElement?.parentElement).not.toHaveClass('mix-blend-multiply')
  expect(overlay.parentElement?.parentElement?.style.getPropertyValue('--part-mask')).toMatch(
    /-part-mask-skin\)$/,
  )
  expect(screen.getAllByRole('img').slice(0, 2)).toEqual([receiver, overlay])
  fireEvent.click(screen.getByRole('button', {name: '머리 그림자 선택'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {target: {value: '45'}})
  expect(overlay.style.getPropertyValue('--part-x')).toBe('45%')
  expect(receiver.style.getPropertyValue('--part-x')).toBe('44%')
  fireEvent.click(screen.getByRole('checkbox', {name: '머리 그림자 표시'}))
  expect(overlay).not.toBeVisible()
  expect(receiver).toBeVisible()
})

it('should control attached cloth through the sleeve while preserving its original paint order', () => {
  const parts = scene.parts
    .filter((part) => ['lapel-right-underlap', 'lapel-right', 'sleeve-right'].includes(part.id))
    .map((part) =>
      part.id === 'lapel-right-underlap' ? {...part, controlledBy: 'sleeve-right'} : part,
    )
  render(() => <PComposition initialParts={parts} />)
  expect(screen.queryByRole('button', {name: `${parts[0].label} 선택`})).toBeNull()
  const cloth = screen.getByRole('img', {name: `${parts[0].label} 파트`})
  const lapel = screen.getByRole('img', {name: `${parts[1].label} 파트`})
  const sleeve = screen.getByRole('img', {name: `${parts[2].label} 파트`})
  expect(screen.getAllByRole('img').slice(0, 3)).toEqual([cloth, lapel, sleeve])
  fireEvent.click(screen.getByRole('button', {name: '오른팔 · 손·소매 펼치기'}))
  fireEvent.click(screen.getByRole('button', {name: `${parts[2].label} 선택`}))
  fireEvent.click(screen.getByRole('checkbox', {name: `${parts[2].label} 표시`}))
  expect(cloth).not.toBeVisible()
  expect(sleeve).not.toBeVisible()
  expect(lapel).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '선택만 표시'}))
  expect(screen.getByRole('img', {name: `${parts[0].label} 파트`})).toBeVisible()
  expect(screen.getByRole('img', {name: `${parts[2].label} 파트`})).toBeVisible()
  expect(screen.queryByRole('img', {name: `${parts[1].label} 파트`})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '기본 조합 복원'}))
  expect(screen.getByRole('img', {name: `${parts[0].label} 파트`})).toBeVisible()
  expect(screen.getByRole('img', {name: `${parts[1].label} 파트`})).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '뒤로'}))
  expect(
    screen
      .getAllByRole('img')
      .slice(0, 3)
      .map((image) => image.getAttribute('alt')),
  ).toEqual([`${parts[0].label} 파트`, `${parts[2].label} 파트`, `${parts[1].label} 파트`])
})

it('should let an individual part be hidden and transformed without changing its neighbors', () => {
  render(() => <PComposition />)
  fireEvent.click(screen.getByRole('button', {name: '머리카락 · 장식 펼치기'}))
  fireEvent.click(screen.getByRole('button', {name: '머리카락 선택'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {target: {value: '20'}})
  const hair = screen.getByAltText('머리카락 파트')
  expect(hair.style.getPropertyValue('--part-x')).toBe('20%')
  expect(
    screen.getByAltText('목 · 가슴 피부 · 기본 명암 파트').style.getPropertyValue('--part-x'),
  ).not.toBe('20%')
  fireEvent.click(screen.getByRole('checkbox', {name: '머리카락 표시'}))
  expect(hair.hidden).toBe(true)
})

it('should restore the fitted composition without shipping a reference overlay', () => {
  render(() => <PComposition />)
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {target: {value: '80'}})
  fireEvent.click(screen.getByRole('button', {name: '기본 조합 복원'}))
  expect(screen.getByRole('spinbutton', {name: '가로 위치 (%)'})).toHaveValue(0)
  expect(screen.queryByRole('slider', {name: '원본 비교'})).not.toBeInTheDocument()
  expect(screen.getByAltText('방 배경 파트').getAttribute('src')).toMatch(
    /assets\/background\.png$/,
  )
  expect(screen.getAllByAltText(/ 파트$/)).toHaveLength(scene.parts.length)
})

it('should restore the chosen scene parts from their asset path', () => {
  const parts = [
    {
      id: 'head-base',
      label: '머리 바탕',
      opacity: 100,
      rotation: 0,
      scaleX: 43,
      scaleY: 50,
      visible: true,
      x: 38,
      y: 8,
    },
  ]
  render(() => <PComposition assetPath="/fixtures/composition" initialParts={parts} />)
  fireEvent.input(screen.getByRole('spinbutton', {name: '가로 위치 (%)'}), {target: {value: '10'}})
  fireEvent.click(screen.getByRole('button', {name: '기본 조합 복원'}))
  expect(screen.getByRole('spinbutton', {name: '가로 위치 (%)'})).toHaveValue(38)
  expect(screen.getByAltText('머리 바탕 파트').getAttribute('src')).toBe(
    '/fixtures/composition/head-base.png',
  )
})

it('should toggle a group, report partial visibility, and preserve attached layers and paint order', () => {
  const base = {
    id: 'base',
    label: '바탕',
    opacity: 100,
    panelGroup: '피부',
    rotation: 0,
    scaleX: 30,
    scaleY: 50,
    visible: true,
    x: 44,
    y: 3,
  }
  const other = {...base, id: 'other', label: '다른 피부'}
  const attached = {...base, controlledBy: 'base', id: 'attached', label: '기본 명암'}
  const hair = {...base, id: 'hair', label: '머리', panelGroup: '머리카락'}
  render(() => <PComposition initialParts={[base, hair, attached, other]} />)
  const order = screen.getAllByAltText(/ 파트$/).map((image) => image.getAttribute('alt'))
  const group = screen.getByRole('checkbox', {name: '피부 그룹 표시'})
  expect(group).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox', {name: '다른 피부 표시'}))
  expect(group).toBePartiallyChecked()
  fireEvent.click(group)
  expect(group).toBeChecked()
  expect(screen.getByAltText('다른 피부 파트')).toBeVisible()
  fireEvent.click(group)
  expect(screen.getByAltText('바탕 파트')).not.toBeVisible()
  expect(screen.getByAltText('기본 명암 파트')).not.toBeVisible()
  expect(screen.getByAltText('머리 파트')).toBeVisible()
  fireEvent.click(group)
  expect(screen.getByAltText('기본 명암 파트')).toBeVisible()
  expect(screen.getAllByAltText(/ 파트$/).map((image) => image.getAttribute('alt'))).toEqual(order)
})

it('should expand groups for selection and collapse them without changing visibility', () => {
  const base = {
    id: 'base',
    label: '바탕',
    opacity: 100,
    panelGroup: '피부',
    rotation: 0,
    scaleX: 30,
    scaleY: 50,
    visible: true,
    x: 44,
    y: 3,
  }
  const hair = {...base, id: 'hair', label: '머리', panelGroup: '머리카락'}
  render(() => <PComposition initialParts={[base, hair]} />)
  expect(screen.queryByRole('button', {name: '머리 선택'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '머리카락 펼치기'}))
  fireEvent.click(screen.getByRole('button', {name: '머리 선택'}))
  expect(screen.getByRole('button', {name: '머리 선택'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: '그룹 모두 접기'}))
  expect(screen.queryByRole('button', {name: '머리 선택'})).toBeNull()
  expect(screen.getByAltText('머리 파트')).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '그룹 모두 펼치기'}))
  expect(screen.getByRole('button', {name: '머리 선택'})).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: '선택만 표시'}))
  expect(screen.getByAltText('머리 파트')).toBeVisible()
  expect(screen.getByAltText('바탕 파트')).not.toBeVisible()
})

const TEST_PART = {
  id: 'base',
  label: '바탕',
  opacity: 100,
  rotation: 0,
  scaleX: 30,
  scaleY: 50,
  visible: true,
  x: 44,
  y: 3,
}

it('should show attached shading when its base is turned on after soloing another part', () => {
  const other = {...TEST_PART, id: 'other', label: '다른 파트'}
  const shade = {...TEST_PART, controlledBy: 'base', id: 'shade', label: '기본 명암'}
  render(() => <PComposition initialParts={[other, TEST_PART, shade]} />)
  fireEvent.click(screen.getByRole('button', {name: '선택만 표시'}))
  expect(screen.getByAltText('기본 명암 파트')).not.toBeVisible()
  fireEvent.click(screen.getByRole('checkbox', {name: '바탕 표시'}))
  expect(screen.getByAltText('기본 명암 파트')).toBeVisible()
})

it('should require the caster when a follower is the only part manually enabled', () => {
  const shade = {...TEST_PART, follows: 'base', id: 'shade', label: '그림자'}
  render(() => <PComposition initialParts={[TEST_PART, shade]} />)
  fireEvent.click(screen.getByRole('checkbox', {name: '바탕 표시'}))
  expect(screen.getByAltText('그림자 파트')).not.toBeVisible()
  expect(screen.getByRole('checkbox', {name: '그림자 표시'})).toBeChecked()
  expect(screen.getByRole('button', {name: '그림자 선택'})).toHaveTextContent('연동 숨김')
})

it('should rotate the clipping shape with its receiver', () => {
  const shade = {...TEST_PART, clipTo: 'base', id: 'shade', label: '그림자'}
  const {container} = render(() => <PComposition initialParts={[TEST_PART, shade]} />)
  fireEvent.input(screen.getByRole('spinbutton', {name: '회전 (°)'}), {target: {value: '25'}})
  const mask = container.querySelector('mask image')
  expect(mask?.getAttribute('style')).toContain('25deg')
  expect(screen.getByAltText('그림자 파트').style.getPropertyValue('--part-angle')).toBe('0deg')
})

it('should clear inherited offsets when switching to generated coordinates', () => {
  const shade = {...TEST_PART, controlledBy: 'base', id: 'shade', label: '그림자'}
  render(() => <PComposition initialParts={[TEST_PART, shade]} />)
  fireEvent.click(screen.getByRole('button', {name: '생성 좌표 그대로'}))
  expect(
    screen.getByAltText('그림자 파트').parentElement?.style.getPropertyValue('--control-transform'),
  ).toBe('none')
})

it('should leave distant attached layers in place when moving a part one step', () => {
  const ids = [
    'inner-top-back',
    'inner-top-back-shading',
    'inner-top-back-cast-shadow',
    'neck-chest',
    'arm-right',
    'inner-top',
    'inner-top-shading',
    'inner-top-cast-shadow',
  ]
  const parts = scene.parts.filter((part) => ids.includes(part.id))
  render(() => <PComposition initialParts={parts} />)
  fireEvent.click(screen.getByRole('button', {name: '내부 옷 · 끈 선택'}))
  fireEvent.click(screen.getByRole('button', {name: '뒤로'}))
  expect(screen.getAllByRole('img').map((part) => part.getAttribute('alt'))).toEqual(
    [0, 1, 2, 3, 5, 4, 6, 7].map((index) => `${parts[index].label} 파트`),
  )
})

it('should keep the transform field in sync after an out-of-range edit at its limit', () => {
  render(() => <PComposition initialParts={[{...TEST_PART, rotation: 180}]} />)
  const rotation = screen.getByRole('spinbutton', {name: '회전 (°)'})
  fireEvent.input(rotation, {target: {value: '999'}})
  fireEvent.blur(rotation)
  expect(rotation).toHaveValue(180)
  expect(screen.getByAltText('바탕 파트').style.getPropertyValue('--part-angle')).toBe('180deg')
})

it('should keep nearby attached layers with the part when stepping forward and back', () => {
  const shade = {...TEST_PART, controlledBy: 'base', id: 'shade', label: '기본 명암'}
  const neighbor = {...TEST_PART, id: 'neighbor', label: '다음 파트'}
  render(() => <PComposition initialParts={[TEST_PART, shade, neighbor]} />)
  const paintOrder = () => screen.getAllByRole('img').map((part) => part.getAttribute('alt'))

  fireEvent.click(screen.getByRole('button', {name: '앞으로'}))
  expect(paintOrder()).toEqual(['다음 파트 파트', '바탕 파트', '기본 명암 파트'])
  fireEvent.click(screen.getByRole('button', {name: '뒤로'}))
  expect(paintOrder()).toEqual(['바탕 파트', '기본 명암 파트', '다음 파트 파트'])
})

it('should paint both strap shadows from the same image with separate receiver masks', () => {
  render(() => <PComposition />)
  const backShadow = screen.getByAltText('머리 투영 그림자 · 뒤 끈 파트')
  const frontShadow = screen.getByAltText('머리 투영 그림자 · 내부 옷·앞 끈 파트')
  expect(backShadow.getAttribute('src')).toBe(frontShadow.getAttribute('src'))
  expect(frontShadow.getAttribute('src')).toMatch(/assets\/inner-top-cast-shadow\.png$/)
  expect(backShadow.parentElement?.parentElement?.style.getPropertyValue('--part-mask')).toMatch(
    /-part-mask-inner-top-back\)$/,
  )
  expect(frontShadow.parentElement?.parentElement?.style.getPropertyValue('--part-mask')).toMatch(
    /-part-mask-inner-top\)$/,
  )
})

it('should export the preview state with the layer settings', () => {
  render(() => <PComposition initialParts={[TEST_PART]} />)
  const configuration = screen.getByLabelText<HTMLTextAreaElement>('조합 설정 JSON')
  fireEvent.input(screen.getByRole('slider', {name: '고개 회전 시험'}), {
    target: {value: '8'},
  })
  fireEvent.input(screen.getByLabelText('투명 가장자리 확인 배경'), {
    target: {value: '#182637'},
  })

  expect(JSON.parse(configuration.value)).toMatchObject({
    preview: {background: '#182637', coordinateMode: 'fitted', pose: 8, soloPartId: null},
    version: 1,
  })
})

it('should export generated coordinates and the active solo part', () => {
  render(() => <PComposition initialParts={[TEST_PART]} />)
  const configuration = screen.getByLabelText<HTMLTextAreaElement>('조합 설정 JSON')
  fireEvent.click(screen.getByRole('button', {name: '생성 좌표 그대로'}))
  fireEvent.click(screen.getByRole('button', {name: '선택만 표시'}))
  expect(JSON.parse(configuration.value)).toMatchObject({
    parts: [{id: 'base', x: 0}],
    preview: {coordinateMode: 'generated', soloPartId: 'base'},
  })

  fireEvent.click(screen.getByRole('button', {name: '기본 조합 복원'}))
  expect(JSON.parse(configuration.value)).toMatchObject({
    parts: [{id: 'base', x: TEST_PART.x}],
    preview: {coordinateMode: 'fitted', soloPartId: null},
  })
})
