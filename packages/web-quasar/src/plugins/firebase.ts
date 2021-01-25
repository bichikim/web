import firebase from 'firebase'
import {App as VueApp, Plugin} from 'vue'

let _app

const getFirebase = async () => {
  await Promise.all([
    import(/* webpackChunkName: 'firebase' */ 'firebase/auth'),
    import(/* webpackChunkName: 'firebase' */ 'firebase/firestore'),
    import(/* webpackChunkName: 'firebase' */ 'firebase/messaging'),
    import(/* webpackChunkName: 'firebase' */ 'firebase/functions'),
  ])

  return _app
}

interface FirebaseConfig {
  /**
   * Auth / General Use
   */
  apiKey: string,
  /**
   * General Use
   */
  appId: string,
  /**
   * General Use
   */
  projectId: string
  /**
   * Auth with popup/redirect
   */
  authDomain: string,
  /**
   * Realtime Database
   */
  databaseURL: string,
  /**
   * Storage
   */
  storageBucket: string,
  /**
   * Cloud Messaging
   */
  messagingSenderId: string
  /**
   * Analytics
   */
  measurementId: string
}

const createFirebase = (config: FirebaseConfig): Plugin => {
  return {
    install(app: VueApp) {
      if (!config) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('there is no firebase config')
        }
        return
      }

      _app = firebase.initializeApp(config)

      app.config.globalProperties.$firebase = getFirebase

      app.mixin({
        mounted() {
          if (this.$root === this) {
            this.$root.$nextTick(() => {
              // get firebase once after render
              getFirebase()
            })
          }
        },
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('firebase initialize app')
      }
    },
  }
}

export default createFirebase
