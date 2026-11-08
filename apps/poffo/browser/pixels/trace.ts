import type {Page} from 'playwright/test'

export interface PixelStage {
  readonly index: number
  readonly kind: string
  readonly target: number
  readonly rectangle: ReadonlyArray<number>
  readonly fingerprint: string
  readonly error: number
  readonly pixels?: ReadonlyArray<number>
}

export interface PixelCapture {
  readonly pixels: ReadonlyArray<number>
  readonly stages: ReadonlyArray<PixelStage>
  readonly commands: ReadonlyArray<unknown>
  readonly context: WebGLContextAttributes | null
  readonly colorSpace: string
  readonly maximumSamples: number
  readonly error: number
}

interface PixelTrace {
  begin(): void
  read(): PixelCapture
}

interface GlTrace {
  readonly gl: WebGL2RenderingContext
  readonly identities: WeakMap<object, number>
  readonly stages: PixelStage[]
  readonly commands: unknown[]
  nextId: number
  observing: boolean
  stageCount: number
}

const TRACED_METHODS = [
  'bufferData',
  'bufferSubData',
  'shaderSource',
  'uniform1f',
  'uniform1i',
  'uniform2f',
  'uniform2fv',
  'uniform3fv',
  'uniform4fv',
  'uniformMatrix3fv',
  'uniformMatrix4fv',
  'pixelStorei',
  'texImage2D',
  'texSubImage2D',
  'activeTexture',
  'bindTexture',
  'bindBuffer',
  'useProgram',
  'bindFramebuffer',
  'blendFunc',
  'blendFuncSeparate',
  'blendEquationSeparate',
  'clearColor',
  'viewport',
  'scissor',
  'enable',
  'disable',
  'drawElements',
  'drawArrays',
  'blitFramebuffer',
] as const

const installFingerprint = (page: Page) =>
  page.addInitScript(() => {
    const OFFSET = 5381
    const PRIME = 33
    const MODULUS = 4_294_967_296
    const fingerprint = (bytes: Uint8Array): string => {
      let hash = OFFSET
      let sum = 0
      for (const byte of bytes) {
        hash = (hash * PRIME + byte) % MODULUS
        sum = (sum + byte) % MODULUS
      }
      return `${hash}:${sum}:${bytes.length}`
    }
    const normalize = (value: unknown, trace: GlTrace): unknown => {
      if (ArrayBuffer.isView(value)) {
        return {
          fingerprint: fingerprint(
            new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
          ),
          type: value.constructor.name,
        }
      }
      if (Array.isArray(value)) {
        return value.map((item) => normalize(item, trace))
      }
      if (value !== null && typeof value === 'object') {
        let id = trace.identities.get(value)
        if (id === undefined) {
          trace.nextId += 1
          id = trace.nextId
          trace.identities.set(value, id)
        }
        return {id, type: value.constructor.name}
      }
      return value
    }
    Reflect.set(globalThis, 'poffoPixelFingerprint', fingerprint)
    Reflect.set(globalThis, 'poffoPixelNormalize', normalize)
  })

/** Observes only the detached capture canvas; the application's source stays unchanged. */
export const installTrace = async (page: Page, selectedStage?: number | 'all'): Promise<void> => {
  await installFingerprint(page)
  await page.addInitScript(
    ({methods, selectedStage}) => {
      const COMPONENTS = 4
      const DESTINATION_START = 4
      const DESTINATION_END = 8
      const fingerprint = (bytes: Uint8Array): string => {
        const calculate = Reflect.get(globalThis, 'poffoPixelFingerprint') as (
          input: Uint8Array,
        ) => string
        return calculate(bytes)
      }
      let active = false
      let last: PixelCapture | undefined
      const traces = new WeakMap<HTMLCanvasElement, GlTrace>()
      const entry = (gl: WebGL2RenderingContext): GlTrace | undefined => {
        if (!active || !(gl.canvas instanceof HTMLCanvasElement) || gl.canvas.isConnected) {
          return
        }
        let trace = traces.get(gl.canvas)
        if (trace === undefined) {
          trace = {
            commands: [],
            gl,
            identities: new WeakMap(),
            nextId: 0,
            observing: false,
            stageCount: 0,
            stages: [],
          }
          traces.set(gl.canvas, trace)
        }
        return trace
      }
      const normalize = (value: unknown, trace: GlTrace): unknown => {
        const convert = Reflect.get(globalThis, 'poffoPixelNormalize') as (
          input: unknown,
          trace: GlTrace,
        ) => unknown
        return convert(value, trace)
      }
      const observe = (gl: WebGL2RenderingContext, kind: string, arguments_: unknown[]): void => {
        if (selectedStage === undefined) {
          return
        }
        const trace = entry(gl)
        if (trace === undefined || trace.observing) {
          return
        }
        const target: WebGLFramebuffer | null = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)
        if (target !== null && gl.getParameter(gl.SAMPLES) > 0) {
          return
        }
        const index = trace.stageCount
        trace.stageCount += 1
        if (selectedStage !== 'all' && index !== selectedStage) {
          return
        }
        trace.observing = true
        const previous: WebGLFramebuffer | null = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target)
        const [left, bottom, right, top] = arguments_.slice(DESTINATION_START, DESTINATION_END) as [
          number,
          number,
          number,
          number,
        ]
        const rectangle =
          kind === 'blitFramebuffer'
            ? [
                Math.min(left, right),
                Math.min(bottom, top),
                Math.abs(right - left),
                Math.abs(top - bottom),
              ]
            : Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)
        const [x, y, width, height] = rectangle as [number, number, number, number]
        const pixels = new Uint8Array(width * height * COMPONENTS)
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        const identity = target === null ? 0 : (normalize(target, trace) as {id: number}).id
        trace.stages.push({
          error: gl.getError(),
          fingerprint: fingerprint(pixels),
          index,
          kind,
          pixels: index === selectedStage ? Array.from(pixels) : undefined,
          rectangle,
          target: identity,
        })
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous)
        trace.observing = false
      }
      const {prototype} = WebGL2RenderingContext
      for (const name of methods) {
        const original = prototype[name]
        Reflect.set(
          prototype,
          name,
          new Proxy(original, {
            apply(target, gl: WebGL2RenderingContext, args: unknown[]) {
              const trace = entry(gl)
              if (trace !== undefined && !trace.observing) {
                trace.commands.push({args: args.map((value) => normalize(value, trace)), name})
              }
              const result: unknown = Reflect.apply(target, gl, args)
              if (name === 'drawElements' || name === 'drawArrays' || name === 'blitFramebuffer') {
                observe(gl, name, args)
              }
              return result
            },
          }),
        )
      }
      const encode = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function toDataURL(...args) {
        const trace = traces.get(this)
        if (active && trace !== undefined) {
          const {gl} = trace
          trace.observing = true
          const previous: WebGLFramebuffer | null = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
          const pixels = new Uint8Array(this.width * this.height * COMPONENTS)
          gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
          last = {
            colorSpace: gl.drawingBufferColorSpace,
            commands: trace.commands.slice(),
            context: gl.getContextAttributes(),
            error: gl.getError(),
            maximumSamples: gl.getParameter(gl.MAX_SAMPLES),
            pixels: Array.from(pixels),
            stages: trace.stages.slice(),
          }
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous)
          trace.observing = false
        }
        return encode.apply(this, args)
      }
      Reflect.set(globalThis, 'poffoPixelTrace', {
        begin: () => {
          active = true
        },
        read: () => {
          if (last === undefined) {
            throw new Error('No detached GPU capture was observed')
          }
          active = false
          return last
        },
      } satisfies PixelTrace)
    },
    {methods: TRACED_METHODS, selectedStage},
  )
}

export const beginTrace = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const trace = Reflect.get(globalThis, 'poffoPixelTrace') as PixelTrace
    trace.begin()
  })

export const readTrace = (page: Page): Promise<PixelCapture> =>
  page.evaluate(() => {
    const trace = Reflect.get(globalThis, 'poffoPixelTrace') as PixelTrace
    return trace.read()
  })
