/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {AutoMeshDialog} from '../AutoMeshDialog'

describe('AutoMeshDialog', () => {
  test('should collect a Live2D-style preset and generation settings before submitting', async () => {
    const onGenerate = vi.fn(() => true)
    const onOpenChange = vi.fn()

    render(() => (
      <AutoMeshDialog
        isOpen
        onGenerate={onGenerate}
        onOpenChange={onOpenChange}
        partName="hair-front"
        textureHeight={120}
        textureWidth={240}
      />
    ))

    expect(screen.getByRole('dialog', {name: '자동 메시 생성'})).toBeVisible()
    expect(screen.getByText(/Parameter 변형과 모션 정점 키프레임/)).toBeVisible()
    expect(screen.getByRole('button', {name: '취소'})).toBeVisible()
    expect(screen.getByRole('spinbutton', {name: '정점 간격'})).toHaveValue(20)

    fireEvent.click(screen.getByRole('radio', {name: /큰 변형/}))
    expect(screen.getByRole('spinbutton', {name: '정점 간격'})).toHaveValue(10)
    fireEvent.input(screen.getByRole('spinbutton', {name: '정점 간격'}), {
      target: {value: '8'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '투명 판정값'}), {
      target: {value: '24'},
    })
    fireEvent.click(screen.getByRole('button', {name: '자동 메시 생성'}))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith({alphaThreshold: 24, cellSize: 8}))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('should stay open when generation cannot be applied', async () => {
    const onGenerate = vi.fn(() => false)
    const onOpenChange = vi.fn()

    render(() => <AutoMeshDialog isOpen onGenerate={onGenerate} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', {name: '자동 메시 생성'}))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledOnce())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('dialog', {name: '자동 메시 생성'})).toBeVisible()
  })

  test('should expose the generation error inside the dialog', () => {
    render(() => (
      <AutoMeshDialog errorMessage="불투명한 픽셀이 없어 메시를 만들 수 없습니다." isOpen />
    ))

    expect(screen.getByRole('alert')).toHaveTextContent(
      '불투명한 픽셀이 없어 메시를 만들 수 없습니다.',
    )
  })

  test('should keep dismissal available while generation is in progress', async () => {
    let resolveGeneration: ((generated: boolean) => void) | undefined
    const onGenerate = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveGeneration = resolve
        }),
    )
    const onOpenChange = vi.fn()

    render(() => <AutoMeshDialog isOpen onGenerate={onGenerate} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', {name: '자동 메시 생성'}))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledOnce())
    expect(screen.getByRole('dialog', {name: '자동 메시 생성'})).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getByRole('button', {name: '자동 메시 설정 닫기'})).toBeEnabled()
    expect(screen.getByRole('button', {name: '취소'})).toBeEnabled()

    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    resolveGeneration?.(true)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
