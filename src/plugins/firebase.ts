import * as firebase from 'firebase/app'
import {App as VueApp, Plugin} from 'vue'

export type App = firebase.app.App

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
      if (!firebase) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('there is no firebase js')
        }
      }
      if (!config) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('there is no firebase config')
        }
        return
      }

      app.config.globalProperties.$firebase = firebase.initializeApp(config)
      if (process.env.NODE_ENV !== 'production') {
        console.log('firebase initialize app')
      }
    },
  }
}

export default createFirebase
