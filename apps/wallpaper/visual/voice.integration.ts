import {spokenText} from '../src/features/voice/text'
import {createVoiceClient} from '../src/features/voice/client'
import {createReadout} from '../src/features/voice/readout'
import {expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {createSynthesis} from '../src/features/voice/synthesis'
import {playAudio} from '../src/features/voice/play-audio'

const AUDIBLE_AMPLITUDE = 0.01
const MODEL_TEST_TIMEOUT = 180_000
it(
  'should generate and play Markdown list items as separate local speech chunks',
  async () => {
    const levels: number[] = []
    const client = createVoiceClient({onLevel: (level) => levels.push(level)})
    const voice = {...DEFAULT_POFFO_VOICE, enabled: true}
    const chunks: string[] = []
    let ended = 0
    const completed = Promise.withResolvers<void>()
    const reader = createReadout({
      onError: completed.reject,
      onStatus: (status) => {
        if (ended === 2 && status === 'idle') {
          completed.resolve()
        }
      },
      port: {
        dispose: client.dispose,
        play: async (audio, settings, signal) => {
          expect(audio.samples.every(Number.isFinite)).toBe(true)
          expect(audio.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
          await client.play(audio, settings, signal)
          ended += 1
        },
        prepare: (text, settings, signal, observer) => {
          chunks.push(text)
          return client.prepare(text, settings, signal, observer)
        },
      },
    })
    const activation = document.createElement('button')
    activation.textContent = '목록 읽기 시작'
    activation.onclick = () => {
      // Unlock browser audio during the gesture before asynchronous model preparation.
      client
        .play(
          {sampleRate: 24_000, samples: Float32Array.of(0)},
          voice,
          new AbortController().signal,
        )
        .then(() =>
          reader.update(
            {chat: 'list', id: '1', text: spokenText('- 사과 `3개`\n- 우유 한 잔')},
            voice,
          ),
        )
        .catch(completed.reject)
    }
    document.body.append(activation)
    try {
      await userEvent.click(activation)
      await completed.promise
      expect(chunks).toEqual(['사과 3개', '우유 한 잔'])
      expect(ended).toBe(2)
      expect(levels.some((level) => level > 0.1)).toBe(true)
      expect(levels.at(-1)).toBe(0)
    } finally {
      reader.dispose()
      activation.remove()
    }
  },
  MODEL_TEST_TIMEOUT,
)

it(
  'should synthesize real Pomo audio, play after a user gesture and retain loaded sessions after cancelled inference',
  async () => {
    const client = createSynthesis()
    const activation = document.createElement('button')
    activation.textContent = '음성 재생 시작'
    document.body.append(activation)
    const voice = {...DEFAULT_POFFO_VOICE, enabled: true}
    try {
      const audio = await client.generate(
        spokenText('사과 `3개`와 진행률 `+12.5%`예요.'),
        voice,
        new AbortController().signal,
        {status: () => undefined},
      )
      expect(audio.sampleRate).toBeGreaterThan(0)
      expect(audio.samples.length).toBeGreaterThan(audio.sampleRate / 2)
      expect(audio.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
      const played = new Promise<void>((resolve, reject) => {
        activation.addEventListener(
          'click',
          () => {
            playAudio(
              audio.samples,
              audio.sampleRate,
              voice.volume,
              new AbortController().signal,
            ).then(resolve, reject)
          },
          {once: true},
        )
      })
      await userEvent.click(activation)
      await played
      const controller = new AbortController()
      const cancelled = client.generate('새 말풍선을 읽습니다.', voice, controller.signal, {
        status: (status) => {
          if (status === 'generating') {
            controller.abort()
          }
        },
      })
      await expect(cancelled).rejects.toMatchObject({name: 'AbortError'})
      const warmStatus: string[] = []
      const next = await client.generate('다시 읽습니다.', voice, new AbortController().signal, {
        status: (status) => warmStatus.push(status),
      })
      expect(warmStatus).not.toContain('download')
      expect(warmStatus).toContain('generating')
      expect(next.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
    } finally {
      client.dispose()
      activation.remove()
    }
  },
  MODEL_TEST_TIMEOUT,
)

it(
  'should generate and append an arriving message before existing audio finishes playing',
  async () => {
    const client = createVoiceClient()
    const voice = {...DEFAULT_POFFO_VOICE, enabled: true}
    const audio = await client.prepare(
      '새로운 작업 내용을 확인하고 있습니다. 선택한 말풍선의 응답을 자연스럽게 읽어 드립니다.',
      voice,
      new AbortController().signal,
      {status: () => undefined},
    )
    const events: string[] = []
    let prepared = 0
    let played = 0
    let ended = 0
    let finish: (() => void) | undefined
    let fail: ((cause: unknown) => void) | undefined
    const completed = new Promise<void>((resolve, reject) => {
      finish = resolve
      fail = reject
    })
    const reader = createReadout({
      onError: (cause) => fail!(cause),
      onStatus: (status) => {
        if (ended === 2 && status === 'idle') {
          finish!()
        }
      },
      port: {
        dispose: client.dispose,
        play: (value, settings, signal) => {
          played += 1
          const index = played
          events.push(`queue:${index}`)
          const playing = client.play(value, settings, signal)
          if (index === 1) {
            reader.update({chat: 'chat', id: '2', text: '다음 내용입니다.'}, voice)
          }
          return playing.then(() => {
            ended += 1
            events.push(`end:${index}`)
          })
        },
        prepare: (text, settings, signal, status) => {
          prepared += 1
          events.push(`prepare:${prepared}`)
          return prepared === 1
            ? Promise.resolve(audio)
            : client.prepare(text, settings, signal, status)
        },
      },
    })
    const activation = document.createElement('button')
    activation.textContent = '연속 읽기 시작'
    activation.onclick = () => reader.update({chat: 'chat', id: '1', text: '첫 내용'}, voice)
    document.body.append(activation)
    try {
      await userEvent.click(activation)
      await completed
      expect(events.indexOf('prepare:2')).toBeLessThan(events.indexOf('end:1'))
      expect(events.indexOf('queue:2')).toBeLessThan(events.indexOf('end:1'))
      expect(events.filter((event) => event.startsWith('end:'))).toEqual(['end:1', 'end:2'])
    } finally {
      reader.dispose()
      activation.remove()
    }
  },
  MODEL_TEST_TIMEOUT,
)

it(
  'should synthesize audible Full-model speech with automatic GPU and explicit CPU in the same worker',
  async () => {
    const client = createSynthesis()
    const voice = {...DEFAULT_POFFO_VOICE, model: 'full' as const}
    try {
      const start = Date.now()
      const automatic = await client.generate(
        '설정을 확인했습니다.',
        voice,
        new AbortController().signal,
        {status: () => undefined},
      )
      expect(automatic.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
      const warm: string[] = []
      const again = await client.generate(
        '다음 내용을 읽습니다.',
        voice,
        new AbortController().signal,
        {status: (status) => warm.push(status)},
      )
      expect(warm).not.toContain('download')
      expect(again.samples.every(Number.isFinite)).toBe(true)
      expect(again.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
      console.info('Full automatic and warm generation completed', {
        milliseconds: Date.now() - start,
      })
      const cpu = await client.generate(
        'CPU로 읽습니다.',
        {...voice, gpu: false},
        new AbortController().signal,
        {status: () => undefined},
      )
      expect(cpu.samples.every(Number.isFinite)).toBe(true)
      expect(cpu.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
    } finally {
      client.dispose()
    }
  },
  MODEL_TEST_TIMEOUT,
)

it(
  'should retain real narration model sessions after one reader closes and another reader starts',
  async () => {
    const voice = {...DEFAULT_POFFO_VOICE, model: 'full' as const}
    const first = createVoiceClient({retainLocalModel: true})
    const second = createVoiceClient({retainLocalModel: true})
    try {
      const started = Date.now()
      const initial = await first.prepare(
        '첫 작업 내용을 읽습니다.',
        voice,
        new AbortController().signal,
        {status: () => undefined},
      )
      const initialTime = Date.now() - started
      expect(initial.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
      first.dispose()
      const statuses: string[] = []
      const repeated = Date.now()
      const next = await second.prepare(
        '다른 채팅 내용을 읽습니다.',
        voice,
        new AbortController().signal,
        {status: (value) => statuses.push(value)},
      )
      expect(statuses).not.toContain('download')
      expect(statuses).toContain('generating')
      expect(next.samples.every(Number.isFinite)).toBe(true)
      expect(next.samples.some((value) => Math.abs(value) > AUDIBLE_AMPLITUDE)).toBe(true)
      console.info('Resident narration timing', {
        initial: initialTime,
        retained: Date.now() - repeated,
      })
    } finally {
      first.dispose()
      second.dispose()
    }
  },
  MODEL_TEST_TIMEOUT,
)
