import {createSoundWorkerController} from '../sound-worker-controller'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {CONNECTION_CONTEXT_SECONDS, SAMPLE_RATE} from '../sound-generation/connection'
import {assembleJoin, getJoinParameterError, prepareJoin, type StereoAudio} from './audio'

export interface JoinRequest {
  readonly first: File
  readonly second: File
  readonly trimEnd: number
  readonly trimStart: number
  readonly connectionSeconds: number
  readonly prompt: string
}
const MAX_SECONDS = 600
const BUSY_ERROR_MESSAGE = '이미 연결 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.'

async function decode(blob: Blob): Promise<StereoAudio> {
  const context = new AudioContext({sampleRate: SAMPLE_RATE})
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    if (buffer.duration > MAX_SECONDS) {
      throw new Error('파일은 각각 10분 이하로 선택해 주세요.')
    }
    return {
      left: buffer.getChannelData(0).slice(),
      right: buffer.getChannelData(Math.min(1, buffer.numberOfChannels - 1)).slice(),
    }
  } finally {
    await context.close()
  }
}

export function useSoundJoining() {
  const controller = createSoundWorkerController({
    busyError: BUSY_ERROR_MESSAGE,
    busyStatus: '연결 생성이 진행 중입니다. 완료 후 다시 시도해 주세요.',
    failureStatus: '연결 생성에 실패했습니다. 다시 시도할 수 있습니다.',
    initialStatus: '두 파일에서 연결할 위치를 고른 뒤 생성하세요.',
    stoppedStatus: '연결 생성을 중지했습니다.',
    workerFailureMessage: '연결 실행기를 불러오지 못했습니다.',
  })
  const generate = (request: JoinRequest) =>
    controller.run({
      initialStatus: '파일을 읽고 연결 구간을 준비하고 있어요…',
      plan: async (context) => {
        if (!isNonBlankString(request.prompt)) {
          throw new Error('영어 소리 설명을 입력해 주세요.')
        }
        context.clearResult()
        const [first, second] = await Promise.all([decode(request.first), decode(request.second)])
        const plan = prepareJoin({...request, first, second})
        return {
          complete: async (blob, completionContext) => {
            completionContext.reportStatus('원본과 연결음을 합치고 있어요…')
            const generated = await decode(blob)
            return {
              blob: assembleJoin(plan, generated),
              status: `연결 완료 · ${(plan.left.length / SAMPLE_RATE).toFixed(1)}초`,
            }
          },
          request: {
            inpaint: {
              ...plan.context,
              end: CONNECTION_CONTEXT_SECONDS + request.connectionSeconds / 2,
              start: CONNECTION_CONTEXT_SECONDS - request.connectionSeconds / 2,
            },
            prompt: request.prompt,
            seconds: 12,
          },
        }
      },
      validate: () => {
        const error = getJoinParameterError(request)
        return error === null ? null : {error, status: '잘라낼 시간과 연결 구간을 확인해 주세요.'}
      },
    })
  const {run: _run, ...state} = controller
  return {...state, generate}
}
