import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import 'firebase/messaging'
import 'firebase/functions'
import {App, Plugin} from 'vue'

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
    install(app: App) {
      if (!config) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('there is no firebase config')
        }
        return
      }
      app.config.globalProperties.$firebase = firebase.initializeApp(config)
    },
  }
}

export default createFirebase
