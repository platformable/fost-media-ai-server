import { Request, Response, NextFunction } from "express"

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization

  if (!auth?.startsWith("Bearer ")) {
    return res.sendStatus(401)
  }

  const token = auth.substring(7)

  if (token !== process.env.API_TOKEN) {
    return res.sendStatus(401)
  }

  next()
}
