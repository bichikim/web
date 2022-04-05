import {StoreManager} from 'src/store/index'
import {InjectionKey} from 'vue-demi'
export const STORE_CONTEXT: InjectionKey<StoreManager> = Symbol('store')
export const STORE_LOCAL_CONTEXT: InjectionKey<StoreManager> = Symbol('store-local')
