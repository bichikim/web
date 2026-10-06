import {createSoundWorkerController} from '../sound-worker-controller'
import type {LoopRequest, SoundRequest} from './types'
export const MAX_REQUEST_SECONDS = 3600
export function useSoundGeneration() {
  const controller = createSoundWorkerController({
    busyError: '이미 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.',
    busyStatus: '생성이 진행 중입니다. 완료 후 다시 시도해 주세요.',
    failureStatus: '생성에 실패했습니다.',
    initialStatus:
      '첫 생성 시 모델 약 1.8GB를 다운로드합니다. 소리 설명은 서버로 전송하지 않습니다.',
    responseFailureStatus: '생성에 실패했습니다. 다시 시도할 수 있습니다.',
    stoppedStatus: '생성을 중지했습니다.',
    workerFailureMessage: '생성 실행기를 불러오지 못했습니다.',
  })
  const generate = (request: SoundRequest | LoopRequest) => {
    controller.run({
      initialStatus: '생성 환경을 확인하고 있어요…',
      plan: {complete: (blob) => ({blob, status: '환경음 생성 완료'}), request},
      validate: () =>
        !('type' in request) &&
        (!Number.isInteger(request.seconds) ||
          request.seconds < 1 ||
          request.seconds > MAX_REQUEST_SECONDS)
          ? {
              error: '생성 길이는 1–3,600초 사이의 정수로 입력해 주세요.',
              status: '생성 길이를 확인해 주세요.',
            }
          : null,
    })
  }
  const {run: _run, ...state} = controller
  return {...state, generate}
}
