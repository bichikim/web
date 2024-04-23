import {Request, Response} from 'express'

export type ExpressContext = {
  req: Request
  res: Response
}
