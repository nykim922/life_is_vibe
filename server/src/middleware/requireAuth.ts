import type { Request, Response, NextFunction } from 'express'
import { getUser } from '../store/tokenStore'

/** 로그인된 사용자만 통과. 세션 + 서버 저장 토큰 존재를 함께 검증한다. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const sub = req.session.userSub
  if (!sub) {
    res.status(401).json({ error: 'unauthenticated', message: '로그인이 필요합니다.' })
    return
  }
  const user = getUser(sub)
  if (!user) {
    // 세션은 있으나 서버 토큰이 없으면 무효 세션으로 간주
    req.session.destroy(() => {
      res.status(401).json({ error: 'unauthenticated', message: '세션이 만료되었습니다.' })
    })
    return
  }
  next()
}
