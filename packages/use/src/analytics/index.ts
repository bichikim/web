import {defaultsDeep} from 'lodash'
import {Directive, DirectiveBinding, inject, InjectionKey, provide} from 'vue-demi'
import {getWindow} from '@winter-love/utils'
export interface AnalyticsDataLayer {
  push: (payload: Record<string, any>) => void
}

export const createGetDataLayer = () => {
  let _init = false

  return (): AnalyticsDataLayer | undefined => {
    const {dataLayer} = getWindow() as any

    if (!_init && !dataLayer && process.env.NODE_ENV === 'development') {
      console.warn('There is no datalayer')
    }

    _init = true

    return dataLayer
  }
}

export const getDataLayer = createGetDataLayer()

export const TRACK_PAYLOAD_KEY: InjectionKey<Record<string, any>> = Symbol('track-payload-key')

export type Track = (eventName: string, payload: any) => unknown

export const useInstanceInject = (key: string | symbol | InjectionKey<any>, instance?: any, defaultValue?: any) => {
  return instance?.$?.provides?.[key as any] ?? defaultValue
}

export const useTackPayload = (instance?: any) => {
  const defaultValue = {}
  if (instance) {
    return useInstanceInject(TRACK_PAYLOAD_KEY, instance, defaultValue)
  }
  return inject(TRACK_PAYLOAD_KEY, defaultValue)
}

export const getEventName = (name?: string) => {
  return `track.${name ?? 'unknown'}`
}

export const useTackPayloadWithInstance = () => {
  return useInstanceInject
}

export const useTrack = <Payload extends Record<string, any>>(
  event?: string | undefined,
  _payload?: Payload,
  instance?: any,
): Track => {

  const injectedPayload = useTackPayload(instance)

  const mergedPayload = defaultsDeep(_payload ?? {}, injectedPayload)

  return (eventName?: string | undefined, payload?: Record<string, any>) => {

    getDataLayer()?.push?.({
      ...defaultsDeep(payload, mergedPayload),
      event: getEventName(eventName),
    })
  }
}

export const provideTrackPayload = (payload: Record<string, any> = {}) => {
  const previousPayload = useTackPayload()
  provide(TRACK_PAYLOAD_KEY, {...previousPayload, ...payload})
}

export interface ElementTrackInfo {
  eventName: string
  handle: (event: any) => unknown
}

export const dropDirectiveBind = (element: any) => {
  const {__track} = element
  if (__track) {
    const {eventName, handle} = __track
    element.removeEventListener(eventName, handle)
  }
}

export const directiveBind = (isInit: boolean = false) => {
  return (element: any, binding: DirectiveBinding) => {
    if (!isInit) {
      dropDirectiveBind(element)
    }
    const {instance, arg: eventName = 'click', value: payload} = binding
    const track = useTrack(eventName, payload, instance)
    const handle = (event: any) => {
      const {altKey, ctrlKey, target} = event ?? {}
      const {id, title, tagName, alt} = target ?? {}
      return track(eventName, {alt, altKey, ctrlKey, id, tagName, title})
    }

    element.addEventListener(eventName, handle)

    element.__track = {
      eventName,
      handle,
    } as ElementTrackInfo
  }
}

export const trackDirective: Directive = {
  created: directiveBind(true),
  unmounted: dropDirectiveBind,
  updated: directiveBind(false),
}
