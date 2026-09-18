import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { now } from "./domain.js";
import { randomUUID } from "node:crypto";
declare module "express-session" {
  interface SessionData {
    userId: string;
    organizationId: string;
    csrf: string;
  }
}
// Express request augmentation uses the framework namespace.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: {
        userId: string;
        organizationId: string;
        role: string;
        timezone: string;
      };
      requestId: string;
    }
  }
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.session.userId || !req.session.organizationId)
    throw new HttpError(401, "Please sign in");
  const m = await db.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: req.session.organizationId,
        userId: req.session.userId,
      },
    },
    include: { user: true, organization: true },
  });
  if (!m || !m.user.active)
    throw new HttpError(401, "Session is no longer valid");
  req.auth = {
    userId: m.userId,
    organizationId: m.organizationId,
    role: m.role,
    timezone: m.organization.timezone,
  };
  next();
};
export const permit =
  (action: "edit" | "operate" | "export" | "admin") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const roles =
      action === "admin"
        ? ["Administrator"]
        : action === "operate"
          ? ["Administrator", "Adviser", "Operations"]
          : ["Administrator", "Adviser"];
    if (!roles.includes(req.auth.role))
      throw new HttpError(403, "Your role does not allow this action");
    next();
  };
export async function owned(model: string, id: string, req: Request) {
  const row = await (db as any)[model].findFirst({
    where: { id, organizationId: req.auth.organizationId },
  });
  if (!row) throw new HttpError(404, "Record not found");
  return row;
}
export async function validOwner(id: string, req: Request) {
  if (
    !(await db.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.auth.organizationId,
          userId: id,
        },
      },
    }))
  )
    throw new HttpError(400, "Owner must belong to this workspace");
}
export const audit = (
  tx: any,
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) =>
  tx.activity.create({
    data: {
      organizationId: req.auth.organizationId,
      actorId: req.auth.userId,
      action,
      entityType,
      entityId,
      summary,
      requestId: req.requestId,
      createdAt: now(),
    },
  });
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
};
