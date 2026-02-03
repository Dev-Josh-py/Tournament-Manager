import { Request, Response, NextFunction } from "express";

const PASSCODE = "Tour2026";

export function verifyPasscode(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${PASSCODE}`) {
    next();
  } else {
    res.status(401).json({ error: "Invalid passcode" });
  }
}

export function loginHandler(req: Request, res: Response) {
  const { passcode } = req.body;
  if (passcode === PASSCODE) {
    res.json({ success: true, token: PASSCODE });
  } else {
    res.status(401).json({ error: "Invalid passcode" });
  }
}
