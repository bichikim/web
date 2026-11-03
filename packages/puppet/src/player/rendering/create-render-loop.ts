export interface CreateRenderLoopOptions {
  /** Whether an external overlay needs every ticker frame; sampled once per draw decision. */
  readonly externalRendering: () => boolean
  /** Draws one frame with the external-rendering state captured for that frame. */
  readonly render: (external: boolean) => void
}

export interface RenderLoop {
  /** Presents a pending frame before its ticker stops. */
  flush(): void
  /** Coalesces completed model calculations until the next draw. */
  invalidate(): void
  /** Forces presentation for explicit redraw, camera and resize operations. */
  redraw(): void
  /** Draws pending model results and active external overlays. */
  tick(): void
}

/** Keeps calculation ticks independent from GPU draws without retaining duplicate frames. */
export const createRenderLoop = (options: CreateRenderLoopOptions): RenderLoop => {
  let pending = false
  let previousExternal = false
  const draw = (external: boolean) => {
    pending = false
    previousExternal = external
    options.render(external)
  }
  return {
    flush() {
      const external = options.externalRendering()
      if (pending || external !== previousExternal) {
        draw(external)
      }
    },
    invalidate() {
      pending = true
    },
    redraw() {
      draw(options.externalRendering())
    },
    tick() {
      const external = options.externalRendering()
      if (pending || external || external !== previousExternal) {
        draw(external)
      }
    },
  }
}
