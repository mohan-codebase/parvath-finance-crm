import { db } from "../apps/api/src/db.js";
import { config } from "../apps/api/src/config.js";
if (
  config.NODE_ENV === "production" ||
  config.DEMO_DATE !== "2026-09-04T06:30:00.000Z"
)
  throw new Error(
    "Verification cleanup is only allowed in the fixed synthetic demo",
  );
const candidates = await db.client.findMany({
  where: { contact: { name: { startsWith: "Journey " } } },
  include: { contact: true },
});
const records = candidates.filter(
  (c) =>
    /^Journey (Client|Business|Import) \d{7}$/.test(c.contact.name) &&
    (!c.contact.email || c.contact.email.endsWith("@example.test")),
);
const ids = records.map((c) => c.id),
  contacts = records.map((c) => c.contactId);
if (ids.length)
  await db.$transaction(async (tx) => {
    const events = await tx.financialEvent.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    const products = await tx.clientProduct.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    const leads = await tx.opportunity.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    const tasks = await tx.followUp.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    const comms = await tx.communication.findMany({
      where: { clientId: { in: ids } },
      select: { id: true },
    });
    const allIds = [
      ...ids,
      ...events.map((v) => v.id),
      ...products.map((v) => v.id),
      ...leads.map((v) => v.id),
      ...tasks.map((v) => v.id),
      ...comms.map((v) => v.id),
    ];
    await tx.activity.deleteMany({ where: { entityId: { in: allIds } } });
    await tx.payment.deleteMany({
      where: { eventId: { in: events.map((e) => e.id) } },
    });
    await tx.followUp.deleteMany({ where: { clientId: { in: ids } } });
    await tx.financialEvent.deleteMany({ where: { clientId: { in: ids } } });
    await tx.clientProduct.deleteMany({ where: { clientId: { in: ids } } });
    await tx.opportunityStageHistory.deleteMany({
      where: { opportunityId: { in: leads.map((v) => v.id) } },
    });
    await tx.opportunity.deleteMany({ where: { clientId: { in: ids } } });
    await tx.communication.deleteMany({ where: { clientId: { in: ids } } });
    await tx.note.deleteMany({ where: { clientId: { in: ids } } });
    await tx.consent.deleteMany({ where: { clientId: { in: ids } } });
    await tx.clientTag.deleteMany({ where: { clientId: { in: ids } } });
    await tx.client.deleteMany({ where: { id: { in: ids } } });
    await tx.business.deleteMany({ where: { contactId: { in: contacts } } });
    await tx.contact.deleteMany({ where: { id: { in: contacts } } });
    const imports = await tx.importJob.findMany({
      where: { state: "Completed" },
    });
    for (const job of imports) {
      if (
        (job.rows as any[]).some((r) =>
          /^Journey Import \d{7}$/.test(r.data?.name || ""),
        )
      ) {
        await tx.activity.deleteMany({ where: { entityId: job.id } });
        await tx.importJob.delete({ where: { id: job.id } });
      }
    }
  });
console.log(
  `Removed ${records.length} explicitly named browser-verification clients and their generated records.`,
);
await db.$disconnect();
