import {describe, expect, it} from 'vitest'

import type {EditDocumentErrorCode} from '../../edit-document'
import {getEditErrorMessage} from '../notices'

const messages: ReadonlyArray<readonly [EditDocumentErrorCode, string]> = [
  ['duplicate-vertex', '같은 위치에 이미 정점이 있습니다.'],
  ['edge-blocked', '현재 메시 구조에서는 두 정점을 연결할 수 없습니다.'],
  ['edge-exists', '두 정점은 이미 간선으로 연결돼 있습니다.'],
  ['invalid-edge', '선택한 간선을 편집할 수 없습니다.'],
  ['invalid-mesh', '작업 결과가 올바른 메시를 만들지 못해 변경하지 않았습니다.'],
  ['invalid-position', '정점 위치가 올바르지 않습니다.'],
  ['invalid-vertex', '선택한 정점을 편집할 수 없습니다.'],
  ['inverted-triangle', '삼각형이 뒤집히거나 사라지는 위치로는 이동할 수 없습니다.'],
  ['minimum-vertex-count', '메시는 최소 4개의 정점이 필요합니다.'],
  ['missing-part', '편집할 이미지 파트를 찾지 못했습니다.'],
  ['outside-mesh', '그려진 메시 영역 안에서만 정점을 추가할 수 있습니다.'],
  ['would-remove-mesh', '마지막 삼각형을 제거하는 정점은 삭제할 수 없습니다.'],
]

describe('getEditErrorMessage', () => {
  it('should map every edit failure to its user-facing notice', () => {
    for (const [code, message] of messages) {
      expect(getEditErrorMessage(code)).toBe(message)
    }
  })
})
