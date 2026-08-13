/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {registerPomoSayTool} from '../index'

interface RegisteredTool {
  readonly execute: (input: unknown) => Promise<unknown>
  readonly name: string
  readonly title: string
}

const createModelContext = () => {
  let tool: RegisteredTool | undefined
  const registerTool = vi.fn(async (registeredTool: RegisteredTool) => {
    tool = registeredTool
  })
  Reflect.set(document, 'modelContext', {registerTool})

  return {
    getTool() {
      if (tool === undefined) {
        throw new Error('Expected pomo_say to be registered.')
      }

      return tool
    },
    registerTool,
  }
}

const removeModelContext = () => {
  Reflect.deleteProperty(document, 'modelContext')
}

afterEach(removeModelContext)

describe('registerPomoSayTool', () => {
  it('should skip registration when WebMCP is unavailable', () => {
    return expect(registerPomoSayTool({document, speak: vi.fn()})).resolves.toBe(false)
  })

  it('should register pomo_say and speak with its default voice', async () => {
    const modelContext = createModelContext()
    const speak = vi.fn(async () => undefined)

    await registerPomoSayTool({document, speak})

    const tool = modelContext.getTool()
    const result = await tool.execute({text: '  새 소식이에요.  '})

    expect(tool).toMatchObject({name: 'pomo_say', title: 'Pomo가 말하기'})
    expect(speak).toHaveBeenCalledWith({text: '새 소식이에요.'})
    expect(result).toEqual({spoken: true, voice: 'Yuna'})
  })

  it('should speak with a requested voice name', async () => {
    const modelContext = createModelContext()
    const speak = vi.fn(async () => undefined)

    await registerPomoSayTool({document, speak})
    const tool = modelContext.getTool()

    const result = await tool.execute({text: '안녕하세요.', voice: 'Alex'})

    expect(speak).toHaveBeenCalledWith({text: '안녕하세요.', voiceId: 'M1'})
    expect(result).toEqual({spoken: true, voice: 'Alex'})
  })

  it('should reject invalid tool input before speaking', async () => {
    const modelContext = createModelContext()
    const speak = vi.fn(async () => undefined)

    await registerPomoSayTool({document, speak})
    const tool = modelContext.getTool()
    const speech = tool.execute({text: '안녕하세요.', voice: 'M1'})

    expect(speak).not.toHaveBeenCalled()
    return expect(speech).rejects.toThrow('지원하지 않는 Pomo 목소리입니다.')
  })
})
