/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../../player'
import {FlipSelectionMenu} from '../FlipSelectionMenu'

const createDocument = (locked = false): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [
    {
      id: 'arm',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [10, 10, 30, 10, 10, 20]},
      texture: {height: 1, src: 'arm.png', width: 1},
    },
  ],
  scene: {roots: [{id: 'arm', kind: 'part', locked, name: 'Arm', visible: true}]},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 100},
})

describe('FlipSelectionMenu', () => {
  test('should flip the selection across the canvas center', async () => {
    const onDocumentChange = vi.fn()
    render(() => (
      <FlipSelectionMenu
        document={createDocument()}
        nodeIds={['arm']}
        onDocumentChange={onDocumentChange}
      />
    ))
    fireEvent.keyDown(screen.getByRole('button', {name: '선택 레이어 반전'}), {key: 'ArrowDown'})
    const item = await screen.findByRole('menuitem', {name: '좌우 반전 (캔버스 중심)'})
    fireEvent.keyDown(item, {key: 'Enter'})
    const [flipped] = onDocumentChange.mock.lastCall as [PuppetDocument]
    expect(flipped.parts[0]?.mesh.vertices).toEqual([90, 10, 70, 10, 90, 20])
  })

  test('should be unavailable with a reason for locked layers', () => {
    render(() => (
      <FlipSelectionMenu
        document={createDocument(true)}
        nodeIds={['arm']}
        onDocumentChange={vi.fn()}
      />
    ))
    const trigger = screen.getByRole('button', {name: '선택 레이어 반전'})
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('title', '잠긴 레이어가 있어 반전할 수 없습니다.')
    expect(trigger).toHaveAccessibleDescription('잠긴 레이어가 있어 반전할 수 없습니다.')
  })
})
