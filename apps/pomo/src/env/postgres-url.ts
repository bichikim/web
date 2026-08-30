import {urlSchema} from './url'

/** Schema for a postgres or postgresql environment URL. */
export const postgresUrlSchema = (name: string) => urlSchema(name, ['postgres:', 'postgresql:'])
