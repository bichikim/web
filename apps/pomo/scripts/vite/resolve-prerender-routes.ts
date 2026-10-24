import type {PomoTarget} from './runtime-target'

export type PrerenderCommand = 'build' | 'serve'

export interface ResolvePrerenderRoutesOptions {
  readonly appsInTossStaticRoutes: ReadonlyArray<string>
  readonly command: PrerenderCommand
  readonly desktopStaticRoutes: ReadonlyArray<string>
  readonly mobileStaticRoutes: ReadonlyArray<string>
  readonly sharedStaticRoutes: ReadonlyArray<string>
  readonly target: PomoTarget
}

export const resolvePrerenderRoutes = ({
  appsInTossStaticRoutes,
  command,
  desktopStaticRoutes,
  mobileStaticRoutes,
  sharedStaticRoutes,
  target,
}: ResolvePrerenderRoutesOptions): Array<string> => {
  if (command !== 'build') {
    return [...sharedStaticRoutes]
  }

  switch (target) {
    case 'web':
      return [...sharedStaticRoutes]
    case 'apps-in-toss':
      return [...appsInTossStaticRoutes]
    case 'desktop':
      return [...desktopStaticRoutes]
    case 'android':
    case 'ios':
      return [...mobileStaticRoutes]
    default: {
      const exhaustive: never = target
      throw new Error(`Unsupported prerender target: ${exhaustive}`)
    }
  }
}
