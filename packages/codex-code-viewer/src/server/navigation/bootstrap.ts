import {register} from 'tsx/esm/api'

register()
await import(new URL('../navigation-worker.ts', import.meta.url).href)
