/* eslint-disable unicorn/consistent-destructuring,prefer-destructuring */
// noinspection ES6PreferShortImport

/*
Welcome to Keystone! This file is what keystone uses to start the app.

It looks at the default export, and expects a Keystone config object.

You can find all the config options in our docs here: https://keystonejs.com/docs/apis/config
*/
import {config} from '@keystone-6/core'
import {KeystoneContext} from '@keystone-6/core/types'
import {extendGraphqlSchema} from './exnted-schema'

export type Context = KeystoneContext & {
  // webAuth
}

const DEFAULT_PORT = 8080
const DB_URL = process.env.NODE_ENV === 'test' ? 'file:./keystone-test.db' : process.env.DB_URL
const DB_PROVIDER = process.env.NODE_ENV === 'test' ? 'sqlite' : 'postgresql'
const PORT = process.env.PORT ?? DEFAULT_PORT
const ORIGIN = process.env.NODE_ENV === 'production' ? ['https://coong.io', 'https://www.coong.io'] : '*'
// Look in the schema file for how we define our lists, and how users interact with them through graphql or the Admin UI
import {lists} from './schema'

// Keystone auth is configured separately - check out the basic auth setup we are importing from our auth file.
import {session, withAuth} from './auth'

export default withAuth(
  // Using the config function helps typescript guide you to the available options.
  config({
    // the db sets the database provider - we're using sqlite for the fastest startup experience
    db: {
      provider: DB_PROVIDER,
      url: DB_URL,
    },

    extendGraphqlSchema,

    images: {
      local: {
        baseUrl: '/images',
        storagePath: 'public/images',
      },
      upload: 'local',
    },
    lists,
    server: {
      cors: {
        optionsSuccessStatus: 200,
        origin: ORIGIN,
      },
      healthCheck: true,
      port: PORT,
    },

    session,
    // This config allows us to set up features of the Admin UI https://keystonejs.com/docs/apis/config#ui
    ui: {
      // For our starter, we check that someone has session data before letting them see the Admin UI.
      isAccessAllowed: (context) => Boolean(context.session?.data),
    },
  }),
)
