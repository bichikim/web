import {computed, defineComponent, reactive, ref, toRefs, UnwrapNestedRefs, watch} from 'vue'

export interface FetchPayload {
  baseUrl?: string
  data?: string | Record<string, any>
  headers?: HeadersInit
  method?: string
  mode?: RequestMode
  params?: Record<string, any>
}

export interface Environments {
  baseUrl?: string
  fetch?: (url: string | Request, payload: any, cancelSignal: any) => Promise<any>
}

export const defaultFetch = (url: string | Request, payload: FetchPayload) => {
  const {data, method, headers, baseUrl = ''} = payload
  return fetch(baseUrl + url, {
    body: data ? JSON.stringify(data) : null,
    headers,
    method,
  })
}

export const createRequest = (environments: Environments = {}) => {
  const {fetch = defaultFetch, ...rest} = environments

  const useRequest = createUseRequest({fetch, ...rest})

  return {
    useRequest,
  }
}

export interface UseRequestOptions {
  loading?: boolean
  transformResponse?: (data: Record<string, any>) => Record<string, any>
  url?: string
}

const createUseRequest = (environments: Environments = {}) => {
  const {fetch = defaultFetch} = environments
  return (options: UnwrapNestedRefs<UseRequestOptions>) => {
    const dataRef = ref()
    const errorRef = ref()
    const loadingRef = ref(options.loading ?? false)
    const abortController = new AbortController()
    const urlRef = computed(() => {
      // eslint-disable-next-line unicorn/consistent-destructuring
      return options.url ?? ''
    })
    //

    const execute = async (payload: any) => {
      try {
        loadingRef.value = true
        dataRef.value = await fetch(urlRef.value, payload, abortController.signal)
        loadingRef.value = false
      } catch (error) {
        errorRef.value = error
        loadingRef.value = false
      }
    }

    const cancel = () => {
      abortController.abort()
    }

    return {
      cancel,
      data: dataRef,
      error: errorRef,
      execute,
      loading: loadingRef,
    }
  }
}

export const useRequest = createUseRequest()

export const Request = defineComponent({
  emits: [
    'update:cancel',
  ],
  props: {
    cancel: {default: false, type: Boolean},
    immediate: {default: false, type: Boolean},
    payload: null,
    transformResponse: {type: Function},
    url: {type: String},
  },
  async setup(props, ctx) {
    const {payload, immediate, url, cancel: cancelRef} = toRefs(props)
    const {data, error, loading, execute, cancel} = useRequest(reactive({
      loading: immediate.value,
      url,
    }))

    watch(cancelRef, (value) => {
      if (value) {
        onCancel()
      }
    })

    const onCancel = () => {
      cancel()
      ctx.emit('update:cancel', false)
    }

    watch(payload, (value) => {
      execute(value)
    })

    if (immediate.value) {
      await execute(payload.value)
    }

    return () => {
      if (error.value) {
        return ctx.slots.error?.(error.value)
      }
      if (loading.value) {
        return ctx.slots.loading?.(loading.value)
      }
      return ctx.slots.default?.(data.value)
    }
  },
})
