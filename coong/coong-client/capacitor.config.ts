import {CapacitorConfig} from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.coong.app',
  appName: 'Coong',
  bundledWebRuntime: false,
  cordova: {},
  plugins: {
    Badge: {
      autoClear: false,
      persist: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      androidScaleType: 'CENTER_CROP',
      backgroundColor: '#000000ff',
      launchAutoHide: true,
    },
  },
  webDir: 'dist/spa',
}

export default config
