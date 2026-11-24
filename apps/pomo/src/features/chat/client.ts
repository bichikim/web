import type {CalendarToolClock} from '../calendar/agent-tool-contract'
import type {TextOutputSchema} from '../text-generation/types'
import type {ChatContext, ChatWorkerRequest, ChatWorkerResponse} from './messages'
import {createWorkerFailureHandler} from '../worker-failure'
import type {TextModelId} from '../text-generation/model'
import {createWorkerTransport} from 'src/utils/worker-transport'
import {createDeviceCalendarTool} from './device-calendar-tool'
import {createCloudChatClient} from './create-cloud-chat-client'

export interface CreateChatClientOptions {
  readonly modelId: TextModelId
  readonly onResponse: (response: ChatWorkerResponse) => void
}

export interface ChatClient {
  readonly dispose: () => void
  readonly generate: (context: ChatContext, replyId: string, options?: GenerateChatOptions) => void
  readonly prepare: () => void
}

export interface GenerateChatOptions {
  readonly calendarTool?: CalendarToolClock
  readonly outputSchema?: TextOutputSchema
  readonly refineAnswer?: boolean
  readonly supplementaryContext?: string
}

/** Creates a local or cloud text client for one chat session. */
export const createChatClient = (options: CreateChatClientOptions): ChatClient => {
  if (options.modelId === 'cloud') {
    return createCloudChatClient(options)
  }
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-chat',
    type: 'module',
  })
  let activeTool: (ReturnType<typeof createDeviceCalendarTool> & {replyId: string}) | undefined
  const closeTool = () => {
    activeTool?.close()
    activeTool = undefined
  }
  const transport = createWorkerTransport<ChatWorkerRequest, ChatWorkerResponse>({
    onFailure: createWorkerFailureHandler({
      fallbackDetail: '채팅 모델 Worker 실행 오류',
      feature: 'chat-model',
      onResponse: (response) => {
        closeTool()
        options.onResponse(response)
      },
    }),
    onResponse: (response) => {
      if (
        response.type === 'complete' ||
        response.type === 'error' ||
        (response.type === 'skipped' &&
          response.request.type === 'generate' &&
          response.request.replyId === activeTool?.replyId)
      ) {
        closeTool()
      }
      options.onResponse(response)
    },
    worker,
  })

  return {
    dispose: () => {
      closeTool()
      transport.dispose()
    },
    generate: (context, replyId, generateOptions = {}) => {
      if (activeTool !== undefined) {
        return
      }

      const tool =
        generateOptions.calendarTool === undefined || generateOptions.outputSchema !== undefined
          ? undefined
          : createDeviceCalendarTool(generateOptions.calendarTool)
      activeTool = tool === undefined ? undefined : {...tool, replyId}
      const request = {
        context,
        ...(generateOptions.outputSchema === undefined
          ? {}
          : {outputSchema: generateOptions.outputSchema}),
        modelId: options.modelId,
        refineAnswer: generateOptions.refineAnswer ?? true,
        replyId,
        ...(generateOptions.supplementaryContext === undefined
          ? {}
          : {supplementaryContext: generateOptions.supplementaryContext}),
        type: 'generate',
      } as const
      if (tool === undefined) {
        transport.send(request)
        return
      }
      try {
        transport.send({...request, calendarTool: tool.endpoint}, [tool.endpoint.port])
      } catch (error: unknown) {
        closeTool()
        tool.endpoint.port.close()
        throw error
      }
    },
    prepare: () => transport.send({modelId: options.modelId, type: 'prepare'}),
  }
}
