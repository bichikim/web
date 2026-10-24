import {handleAudioGatewayRequest} from './gateway'

interface AudioGatewayVariables {
  readonly ALLOWED_ORIGINS: string
  readonly ALLOWED_ORIGIN_SUFFIXES: string
  readonly PLAYBACK_TOKEN_SECRET: string
  readonly R2_OBJECT_PREFIX: string
}

interface AudioGatewayEnv extends Omit<Env, keyof AudioGatewayVariables>, AudioGatewayVariables {}

export default {
  fetch(request, environment, context): Promise<Response> {
    return handleAudioGatewayRequest({
      cache: caches.default,
      config: {
        allowedOrigins: environment.ALLOWED_ORIGINS,
        allowedOriginSuffixes: environment.ALLOWED_ORIGIN_SUFFIXES,
        playbackTokenSecret: environment.PLAYBACK_TOKEN_SECRET,
        storagePrefix: environment.R2_OBJECT_PREFIX,
      },
      request,
      storage: environment.PAID_AUDIO,
      waitUntil: (promise) => context.waitUntil(promise),
    })
  },
} satisfies ExportedHandler<AudioGatewayEnv>
