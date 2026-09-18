import { db } from "./db.js";
import argon2 from "argon2";
import { z } from "zod";
const v = z
  .object({
    ADMIN_EMAIL: z.email(),
    ADMIN_NAME: z.string().min(2),
    ADMIN_PASSWORD: z.string().min(12).max(128),
    WORKSPACE_NAME: z.string().default("Parvath FinServ"),
  })
  .parse(process.env);
const user = await db.transaction(async (tx) => {
  if (
    await tx.user.findUnique({ where: { email: v.ADMIN_EMAIL.toLowerCase() } })
  )
    throw new Error("Account already exists; refusing to replace credentials");
  const org = await tx.organization.create({
    data: { name: v.WORKSPACE_NAME },
  });
  return tx.user.create({
    data: {
      name: v.ADMIN_NAME,
      email: v.ADMIN_EMAIL.toLowerCase(),
      passwordHash: await argon2.hash(v.ADMIN_PASSWORD),
      memberships: {
        create: { organizationId: org.id, role: "Administrator" },
      },
    },
  });
});
console.log(
  `Administrator created: ${user.email}. No password has been stored in source files.`,
);
await db.close();
