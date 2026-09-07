import {vi} from 'vitest'
import type {PictureDiaryEditorProps} from '../../editor-props'
export const createEditorProps = (): PictureDiaryEditorProps => ({
  canSave: true,
  date: '2026-09-06',
  onDateChange: vi.fn(),
  onSave: vi.fn(),
  onStrokesChange: vi.fn(),
  onTextChange: vi.fn(),
  spread: {left: {kind: 'cover'}, right: {kind: 'writing'}},
  strokes: [],
  text: '오늘의 일기',
})
export const ENTRY = {
  createdAt: '2026-09-06T00:00:00Z',
  date: '2026-09-06',
  id: 'entry',
  strokes: [],
  text: '산책한 날',
  updatedAt: '2026-09-06T00:00:00Z',
  version: 1,
} as const
