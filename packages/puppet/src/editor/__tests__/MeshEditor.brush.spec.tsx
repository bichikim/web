/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, getDocumentScene, type PuppetDocument} from '../../player'
import {MeshEditor} from '../MeshEditor'
import {convertSceneContainers} from '../internal/container-conversion'
import {createDeformer} from '../internal/scene-graph'

const pointer = (type: string, x: number, y: number, pointerId = 1) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
  Object.defineProperty(event, 'pointerId', {value: pointerId})
  return event
}

const prepareCanvas = (view: ReturnType<typeof render>) => {
  const svg = view.getByLabelText('메시 정점 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 960, 720))
  fireEvent.click(view.getByRole('button', {name: '정점 부드럽게 브러시'}))
  return svg
}

test.each([false, true])(
  'should save smoothing to the selected motion or cancel on switching=$switchMotion',
  (switchMotion) => {
    const document = createDemoDocument()
    const [motionId, setMotionId] = createSignal('blink')
    const save = vi.fn()
    const view = render(() => (
      <MeshEditor
        activePartId="mesh-preview"
        document={document}
        editMode="motion"
        motionId={motionId()}
        previewTime={0.2}
        onDocumentChange={save}
      />
    ))
    const svg = prepareCanvas(view)
    const center = svg.querySelectorAll('circle')[4]!
    fireEvent(
      svg,
      pointer(
        'pointerdown',
        Number(center.getAttribute('cx')) + 160,
        Number(center.getAttribute('cy')) + 120,
      ),
    )
    if (switchMotion) {
      setMotionId('nod')
    }
    fireEvent(svg, pointer('pointerup', 0, 0))
    if (switchMotion) {
      expect(save).not.toHaveBeenCalled()
    } else {
      expect(save).toHaveBeenCalledOnce()
      const updated: PuppetDocument = save.mock.calls[0]![0]
      expect(updated.motions[0]).toBe(document.motions[0])
      expect(updated.motions[2]).toBe(document.motions[2])
      expect(updated.motions[1]?.tracks).toEqual(
        expect.arrayContaining([expect.objectContaining({kind: 'vertex', partId: 'mesh-preview'})]),
      )
    }
  },
)

test('should retain the displayed smoothing position when saving a spatially rotated part', () => {
  const demo = createDemoDocument()
  const original = demo.parts[0]!
  const source = {
    ...demo,
    parts: [
      {
        ...original,
        mesh: {...original.mesh, vertices: [...original.mesh.vertices.slice(0, 8), 350, 260]},
      },
    ],
  }
  const grouped = createDeformer(source, ['mesh-preview'])!
  const converted = convertSceneContainers({
    document: grouped,
    nodeIds: ['deformer'],
    targetKind: 'spatial',
  })!
  const scene = getDocumentScene(converted)
  const initial: PuppetDocument = {
    ...converted,
    scene: {
      ...scene,
      roots: scene.roots.map((node) =>
        node.id === 'deformer' && node.kind === 'deformer'
          ? {...node, spatialRotation: [0, 60, 0]}
          : node,
      ),
    },
  }
  const [document, setDocument] = createSignal(initial)
  const save = vi.fn(setDocument)
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={[30, 0]}
      document={document()}
      editMode="parameter"
      parameterValues={[30, 0]}
      onDocumentChange={save}
    />
  ))
  const svg = prepareCanvas(view)
  const center = svg.querySelectorAll('circle')[4]!
  fireEvent(
    svg,
    pointer(
      'pointerdown',
      Number(center.getAttribute('cx')) + 160,
      Number(center.getAttribute('cy')) + 120,
    ),
  )
  const preview = [Number(center.getAttribute('cx')), Number(center.getAttribute('cy'))]
  fireEvent(svg, pointer('pointerup', 0, 0))
  expect(save).toHaveBeenCalledOnce()
  expect(Number(center.getAttribute('cx'))).toBeCloseTo(preview[0]!, 3)
  expect(Number(center.getAttribute('cy'))).toBeCloseTo(preview[1]!, 3)
  expect(document().parts).toBe(initial.parts)
})

test('should discard smoothing when the selected keyform changes before release', () => {
  const initial = createDemoDocument()
  const [values, setValues] = createSignal<readonly [number, number]>([30, 0])
  const save = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={values()}
      document={initial}
      editMode="parameter"
      parameterValues={values()}
      onDocumentChange={save}
    />
  ))
  const svg = prepareCanvas(view)
  fireEvent(svg, pointer('pointerdown', 576, 360))
  setValues([0, 30])
  fireEvent(svg, pointer('pointerup', 0, 0))
  expect(save).not.toHaveBeenCalled()
})

test('should ignore a different pointer while a smoothing stroke is active', () => {
  const initial = createDemoDocument()
  const save = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={[30, 0]}
      document={initial}
      editMode="parameter"
      parameterValues={[30, 0]}
      onDocumentChange={save}
    />
  ))
  const svg = prepareCanvas(view)
  fireEvent(svg, pointer('pointerdown', 576, 360))
  const center = svg.querySelectorAll('circle')[4]!
  const preview = center.getAttribute('cx')
  fireEvent(svg, pointer('pointermove', 544, 360, 2))
  expect(center.getAttribute('cx')).toBe(preview)
  fireEvent(svg, pointer('pointerup', 0, 0, 2))
  expect(save).not.toHaveBeenCalled()
  fireEvent(svg, pointer('pointerup', 0, 0))
  expect(save).toHaveBeenCalledOnce()
})

test.each(['pointercancel', 'lostpointercapture', 'blur'])(
  'should release capture and discard the draft on %s',
  (type) => {
    const initial = createDemoDocument()
    const save = vi.fn()
    const view = render(() => (
      <MeshEditor
        activePartId="mesh-preview"
        activeBindingId="angle-xy"
        activeKeyformValues={[30, 0]}
        document={initial}
        editMode="parameter"
        parameterValues={[30, 0]}
        onDocumentChange={save}
      />
    ))
    const svg = prepareCanvas(view)
    const release = vi.fn()
    Object.defineProperty(svg, 'hasPointerCapture', {value: () => true})
    Object.defineProperty(svg, 'releasePointerCapture', {value: release})
    const center = svg.querySelectorAll('circle')[4]!
    const before = center.getAttribute('cx')
    fireEvent(svg, pointer('pointerdown', 576, 360))
    expect(center.getAttribute('cx')).not.toBe(before)
    if (type === 'blur') {
      globalThis.dispatchEvent(new Event('blur'))
    } else {
      fireEvent(svg, pointer(type, 0, 0))
    }
    expect(center.getAttribute('cx')).toBe(before)
    expect(release).toHaveBeenCalledWith(1)
    fireEvent(svg, pointer('pointerup', 0, 0))
    expect(save).not.toHaveBeenCalled()
  },
)

test('should leave the document unchanged and report a rejected rest mesh edit', () => {
  const demo = createDemoDocument()
  const original = demo.parts[0]!
  const initial = {
    ...demo,
    motions: [],
    parts: [
      {
        ...original,
        mesh: {...original.mesh, vertices: [...original.mesh.vertices.slice(0, 8), 350, 260]},
      },
    ],
  }
  const save = vi.fn()
  const notice = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      document={initial}
      meshEditing
      onDocumentChange={save}
      onNotice={notice}
    />
  ))
  const svg = prepareCanvas(view)
  const before = initial.parts[0]!.mesh.vertices.slice()
  fireEvent(svg, pointer('pointerdown', 510, 380))
  fireEvent(svg, pointer('pointerup', 0, 0))
  expect(save).not.toHaveBeenCalled()
  expect(notice).toHaveBeenCalledWith(expect.stringContaining('UV'))
  expect(initial.parts[0]!.mesh.vertices).toEqual(before)
})

test('should preview smoothing inside the mesh, preserve the outline and save once', () => {
  const demo = createDemoDocument()
  const original = demo.parts[0]!
  const initial = {
    ...demo,
    motions: [],
    parts: [
      {
        ...original,
        mesh: {
          ...original.mesh,
          uvs: [...original.mesh.uvs.slice(0, 8), 350 / 640, 260 / 480],
          vertices: [...original.mesh.vertices.slice(0, 8), 350, 260],
        },
      },
    ],
  }
  const save = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      document={initial}
      meshEditing
      onDocumentChange={save}
    />
  ))
  const svg = view.getByLabelText('메시 정점 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 960, 720))
  const center = svg.querySelectorAll('circle')[4]!
  fireEvent.click(view.getByRole('button', {name: '정점 부드럽게 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 510, clientY: 380}),
  )
  expect(Number(center.getAttribute('cx'))).toBeLessThan(350)
  expect(Number(center.getAttribute('cy'))).toBeLessThan(260)
  expect(save).not.toHaveBeenCalled()
  fireEvent.pointerUp(svg)
  expect(save).toHaveBeenCalledOnce()
  expect(save.mock.calls[0]![0].parts[0].mesh.vertices.slice(0, 8)).toEqual(
    initial.parts[0]!.mesh.vertices.slice(0, 8),
  )
  expect(initial.parts[0]!.mesh.vertices[8]).toBe(350)
})

test('should apply smoothing only to the selected parameter keyform', () => {
  const initial = createDemoDocument()
  const save = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={[30, 0]}
      document={initial}
      editMode="parameter"
      parameterValues={[30, 0]}
      onDocumentChange={save}
    />
  ))
  const svg = view.getByLabelText('메시 정점 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 960, 720))
  fireEvent.click(view.getByRole('button', {name: '정점 부드럽게 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 576, clientY: 360}),
  )
  fireEvent.pointerUp(svg)
  expect(save).toHaveBeenCalledOnce()
  const updated: PuppetDocument = save.mock.calls[0]![0]
  expect(updated.parts).toEqual(initial.parts)
  const changed = updated.parameterBindings![0]!.keyforms.filter(
    (form, index) =>
      JSON.stringify(form) !== JSON.stringify(initial.parameterBindings![0]!.keyforms[index]),
  )
  expect(changed).toHaveLength(1)
  expect(changed[0]!.values).toEqual([30, 0])
})

test('should cancel an unfinished smoothing stroke on Escape', () => {
  const initial = createDemoDocument()
  const save = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={[30, 0]}
      document={initial}
      editMode="parameter"
      parameterValues={[30, 0]}
      onDocumentChange={save}
    />
  ))
  const svg = view.getByLabelText('메시 정점 편집 영역')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 960, 720))
  fireEvent.click(view.getByRole('button', {name: '정점 부드럽게 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 576, clientY: 360}),
  )
  fireEvent.keyDown(svg, {key: 'Escape'})
  fireEvent.pointerUp(svg)
  expect(save).not.toHaveBeenCalled()
})

test('should select exactly one mouse editing tool', () => {
  const view = render(() => <MeshEditor document={createDemoDocument()} />)
  const mouse = view.getByRole('button', {name: '정점 선택·이동'})
  const brush = view.getByRole('button', {name: '변형 브러시'})

  expect(mouse.getAttribute('aria-pressed')).toBe('true')
  expect(brush.getAttribute('aria-pressed')).toBe('false')

  fireEvent.click(brush)
  fireEvent.click(brush)
  expect(mouse.getAttribute('aria-pressed')).toBe('false')
  expect(brush.getAttribute('aria-pressed')).toBe('true')

  fireEvent.click(mouse)
  expect(mouse.getAttribute('aria-pressed')).toBe('true')
  expect(brush.getAttribute('aria-pressed')).toBe('false')
})

test('should commit a deform brush stroke as one document change', () => {
  const initial = {...createDemoDocument(), motions: []}
  const onDocumentChange = vi.fn()
  const onNotice = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      document={initial}
      onDocumentChange={onDocumentChange}
      onNotice={onNotice}
    />
  ))
  const svg = view.container.querySelector('svg')!
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '변형 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 480, clientY: 360}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 490, clientY: 360}))
  fireEvent.pointerUp(svg)
  expect(onDocumentChange, JSON.stringify(onNotice.mock.calls)).toHaveBeenCalledOnce()
  expect(onDocumentChange.mock.calls[0]![0].parts[0].mesh.vertices).not.toEqual(
    initial.parts[0]?.mesh.vertices,
  )
})

test('should preview the boundary with the displaced brush vertices', () => {
  const initial = {...createDemoDocument(), motions: []}
  const view = render(() => (
    <MeshEditor activePartId="mesh-preview" document={initial} onDocumentChange={vi.fn()} />
  ))
  const svg = view.container.querySelector('svg')!
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  const boundary = view.container.querySelector('clipPath path')!
  const original = boundary.getAttribute('d')

  fireEvent.click(view.getByRole('button', {name: '변형 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 160, clientY: 120}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 170, clientY: 120}))

  expect(boundary.getAttribute('d')).not.toBe(original)
  expect(boundary.getAttribute('d')).toContain('M 10 0')
})

test('should discard an unfinished brush stroke when the document changes', () => {
  const initial = {...createDemoDocument(), motions: []}
  const [document, setDocument] = createSignal<PuppetDocument>(initial)
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      document={document()}
      onDocumentChange={onDocumentChange}
    />
  ))
  const svg = view.container.querySelector('svg')!
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '변형 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 480, clientY: 360}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 490, clientY: 360}))
  setDocument({...initial})
  fireEvent.pointerUp(svg)
  expect(onDocumentChange).not.toHaveBeenCalled()
})

test('should apply the brush to the selected parameter keyform', () => {
  const initial = createDemoDocument()
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      activeBindingId="angle-xy"
      activeKeyformValues={[30, 0]}
      document={initial}
      editMode="parameter"
      parameterValues={[30, 0]}
      onDocumentChange={onDocumentChange}
    />
  ))
  const svg = view.container.querySelector('svg')!
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '변형 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 576, clientY: 360}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 586, clientY: 360}))
  fireEvent.pointerUp(svg)
  expect(onDocumentChange).toHaveBeenCalledOnce()
  const updated: PuppetDocument = onDocumentChange.mock.calls[0]![0]
  expect(updated.parts[0]?.mesh.vertices).toEqual(initial.parts[0]?.mesh.vertices)
  expect(updated.parameterBindings?.[0]?.keyforms).not.toEqual(
    initial.parameterBindings?.[0]?.keyforms,
  )
})

test('should apply the brush in rest mesh editing with one history change', () => {
  const initial = {...createDemoDocument(), motions: []}
  const onDocumentChange = vi.fn()
  const view = render(() => (
    <MeshEditor
      activePartId="mesh-preview"
      document={initial}
      meshEditing
      editMode="parameter"
      onDocumentChange={onDocumentChange}
    />
  ))
  const svg = view.container.querySelector('svg')!
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    bottom: 720,
    height: 720,
    left: 0,
    right: 960,
    toJSON: () => ({}),
    top: 0,
    width: 960,
    x: 0,
    y: 0,
  })
  fireEvent.click(view.getByRole('button', {name: '변형 브러시'}))
  fireEvent(
    svg,
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 480, clientY: 360}),
  )
  fireEvent(svg, new MouseEvent('pointermove', {bubbles: true, clientX: 490, clientY: 360}))
  fireEvent.pointerUp(svg)
  expect(onDocumentChange).toHaveBeenCalledOnce()
})
