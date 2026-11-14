import {expect, test} from 'vitest'
import {getSpeechSpeed, prepareSpeechLine} from '../configuration'

test('should give the short download line a pause, clear word boundary and slower pace', () => {
  const spoken = prepareSpeechLine('지금 다운로드하세요.')
  expect(spoken).toBe('지금, 다운로드 하세요.')
  expect(getSpeechSpeed(spoken)).toBe(0.85)
  expect(prepareSpeechLine(spoken)).toBe(spoken)
})

test('should retain normal narration text and speed', () => {
  const text = '사진·동영상, 웹사이트와 라이브 배경을 지원합니다.'
  expect(prepareSpeechLine(text)).toBe(text)
  expect(getSpeechSpeed(text)).toBe(1.05)
  expect(getSpeechSpeed('안녕')).toBe(0.8)
})
