/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/design-system/PModal'
import {PModelDownloadConsent} from '../PModelDownloadConsent'

vi.mock('src/design-system/PModal', () => ({PModal: vi.fn()}))

it('should explain download size and possible network charges before confirmation', () => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) =>
    props.isOpen ? (
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    ) : null,
  )
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  render(() => (
    <PModelDownloadConsent
      actionLabel="대사 만들기"
      downloadSize="약 3.7GB"
      isOpen
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  ))

  const dialog = screen.getByRole('dialog', {name: '약 3.7GB 모델을 받을까요?'})
  expect(dialog.textContent).toContain('데이터 요금이 발생할 수 있어요')
  expect(dialog.textContent).toContain('다운로드 후 대사 만들기가 자동으로 시작돼요')
  expect(dialog.textContent).not.toContain('브라우저')
  expect(dialog.querySelectorAll('p')).toHaveLength(2)
  expect(dialog.querySelectorAll('button')).toHaveLength(2)
  expect(dialog.querySelector('.i-tabler-download')).toBeNull()
  expect(vi.mocked(PModal).mock.lastCall?.[0].closeButtonVisibility).toBe('hidden')

  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onConfirm).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})
