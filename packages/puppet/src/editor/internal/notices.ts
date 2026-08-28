import type {EditDocumentErrorCode} from '../edit-document'

export const getEditErrorMessage = (code: EditDocumentErrorCode) => {
  switch (code) {
    case 'duplicate-vertex':
      return '같은 위치에 이미 정점이 있습니다.'
    case 'edge-blocked':
      return '현재 메시 구조에서는 두 정점을 연결할 수 없습니다.'
    case 'edge-exists':
      return '두 정점은 이미 간선으로 연결돼 있습니다.'
    case 'invalid-edge':
      return '선택한 간선을 편집할 수 없습니다.'
    case 'invalid-mesh':
      return '작업 결과가 올바른 메시를 만들지 못해 변경하지 않았습니다.'
    case 'invalid-position':
      return '정점 위치가 올바르지 않습니다.'
    case 'invalid-vertex':
      return '선택한 정점을 편집할 수 없습니다.'
    case 'inverted-triangle':
      return '삼각형이 뒤집히거나 사라지는 위치로는 이동할 수 없습니다.'
    case 'minimum-vertex-count':
      return '메시는 최소 4개의 정점이 필요합니다.'
    case 'missing-part':
      return '편집할 이미지 파트를 찾지 못했습니다.'
    case 'outside-mesh':
      return '그려진 메시 영역 안에서만 정점을 추가할 수 있습니다.'
    case 'would-remove-mesh':
      return '마지막 삼각형을 제거하는 정점은 삭제할 수 없습니다.'
    default: {
      const exhaustiveCode: never = code
      return exhaustiveCode
    }
  }
}
