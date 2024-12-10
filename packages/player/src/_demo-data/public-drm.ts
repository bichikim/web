import {DrmOptions} from 'src/player/types'

export const url =
  'https://media.axprod.net/TestVectors/v7-MultiDRM-SingleKey/Manifest.mpd'
export const drm: DrmOptions = {
  advanced: {
    'com.microsoft.playready': {
      headers: {
        'X-AxDRM-Message':
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoxLCJjb21fa2V5X2lkIjoiYjMzN' +
          'jRlYjUtNTFmNi00YWUzLThjOTgtMzNjZWQ1ZTMxYzc4IiwibWVzc2FnZSI6eyJ0eXBlIjoiZW50aXRs' +
          'ZW1lbnRfbWVzc2FnZSIsImtleXMiOlt7ImlkIjoiOWViNDA1MGQtZTQ0Yi00ODAyLTkzMmUtMjdkNz' +
          'UwODNlMjY2IiwiZW5jcnlwdGVkX2tleSI6ImxLM09qSExZVzI0Y3Iya3RSNzRmbnc9PSJ9XX19.4l' +
          'WwW46k-oWcah8oN18LPj5OLS5ZU-_AQv7fe0JhNjA',
      },
    },
    'com.widevine.alpha': {
      headers: {
        'X-AxDRM-Message':
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoxLCJjb21fa2V5X2lkIjoiYjMz' +
          'NjRlYjUtNTFmNi00YWUzLThjOTgtMzNjZWQ1ZTMxYzc4IiwibWVzc2FnZSI6eyJ0eXBlIjoiZW50a' +
          'XRsZW1lbnRfbWVzc2FnZSIsImtleXMiOlt7ImlkIjoiOWViNDA1MGQtZTQ0Yi00ODAyLTkzMmUtMj' +
          'dkNzUwODNlMjY2IiwiZW5jcnlwdGVkX2tleSI6ImxLM09qSExZVzI0Y3Iya3RSNzRmbnc9PSJ9XX19' +
          '.4lWwW46k-oWcah8oN18LPj5OLS5ZU-_AQv7fe0JhNjA',
      },
    },
  },
  servers: {
    'com.microsoft.playready':
      'https://drm-playready-licensing.axtest.net/AcquireLicense',
    'com.widevine.alpha': 'https://drm-widevine-licensing.axtest.net/AcquireLicense',
  },
}
