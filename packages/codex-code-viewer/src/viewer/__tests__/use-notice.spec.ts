import {createRoot} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useNotice} from '../use-notice'

describe('useNotice', () => {
  it('should issue a fresh notice for repeated text so its display lifetime restarts', () => {
    createRoot((dispose) => {
      const notification = useNotice()
      notification.notify('파일을 찾을 수 없습니다.')
      const first = notification.notice()
      notification.notify('파일을 찾을 수 없습니다.')
      expect(notification.notice()).toEqual({message: '파일을 찾을 수 없습니다.'})
      expect(notification.notice()).not.toBe(first)
      dispose()
    })
  })

  it('should clear the notice and allow a later notification', () => {
    createRoot((dispose) => {
      const notification = useNotice()
      notification.notify('알림')
      notification.dismiss()
      expect(notification.notice()).toBeNull()
      notification.notify('새 알림')
      expect(notification.notice()).toEqual({message: '새 알림'})
      dispose()
    })
  })
})
