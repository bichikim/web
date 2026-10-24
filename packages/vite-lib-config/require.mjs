import {createConfig} from './index.mjs'
import dotenv from 'dotenv'

// load env data from .env file
dotenv.config()

export default createConfig()
