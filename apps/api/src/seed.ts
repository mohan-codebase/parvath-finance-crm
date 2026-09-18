import { db } from "./db.js";
import { config } from "./config.js";
import { dateOnly, now } from "./domain.js";
import { stages } from "../../../packages/contracts/src/index.js";
if (config.NODE_ENV === "production" || !config.DEMO_DATE)
  throw new Error("Demo seed requires a fixed DEMO_DATE outside production");
const m = await db.membership.findFirst({
  where: { role: "Administrator" },
  include: { user: true },
});
if (!m) throw new Error("Create an administrator first: npm run admin:create");
const org = m.organizationId,
  owner = m.userId;
if (await db.client.count({ where: { organizationId: org } })) {
  console.log("Workspace has records; seed skipped to protect existing data.");
  await db.$disconnect();
  process.exit(0);
}
const names = [
  "Rajesh Kumar",
  "Meena S",
  "Arun Kumar",
  "Priya Nair",
  "Suresh Babu",
  "Kavitha R",
  "Vikram S",
  "Anita Joseph",
  "Mohamed Ali",
  "Divya Shankar",
  "Arun Prakash",
  "Latha R",
  "Karthik S",
  "Nivetha M",
  "Ramesh K",
  "Priya Menon",
  "Divya Sharma",
  "Manoj Kumar",
  "Senthil Kumar",
  "Harini S",
  "Ajay Kulkarni",
  "Sandeep R",
  "Gokul V",
  "Neha Kapoor",
  "Kishore M",
  "Deepak S",
  "Anita Kumar",
  "Greenfield Textiles",
  "Lotus Technologies",
  "Veda Enterprises",
];
const cities = [
  "Chennai",
  "Chennai",
  "Bengaluru",
  "Chennai",
  "Coimbatore",
  "Chennai",
  "Madurai",
  "Kochi",
  "Chennai",
  "Hyderabad",
];
const specs = [
  ["Life Insurance", "LIC", "Jeevan Anand"],
  ["Health Insurance", "Star Health", "Family Floater"],
  ["Vehicle Insurance", "ICICI Lombard", "Motor Protect"],
  ["Home Loan", "HDFC Bank", "Home Loan"],
  ["Investment", "Tata Power", "Corporate Bonds"],
  ["Term Insurance", "Max Life", "Smart Secure"],
  ["Business Loan", "SBI", "Business Growth"],
];
await db.$transaction(
  async (tx) => {
    const definitions = [];
    for (const [category, provider, name] of specs) {
      const p = await tx.provider.create({
        data: { organizationId: org, name: provider },
      });
      definitions.push(
        await tx.productDefinition.create({
          data: { organizationId: org, providerId: p.id, name, category },
        }),
      );
    }
    const clients: any[] = [];
    for (const [i, name] of names.entries()) {
      const kind = i >= 27 ? "Business" : "Individual";
      clients.push(
        await tx.client.create({
          data: {
            organization: { connect: { id: org } },
            ownerId: owner,
            isClient: i < 10 || i >= 27,
            status: [2, 8].includes(i)
              ? "Lead"
              : i === 4
                ? "Needs Attention"
                : "Active",
            source: "Referral",
            annualIncome: i < 10 ? "₹25 – 50 Lakhs" : undefined,
            riskProfile: "Moderate",
            investmentInterest: "Mutual Funds, Bonds, Debentures",
            loanInterest: "Home Loan, Personal Loan",
            preferredContact: "WhatsApp",
            notesText: i === 0 ? "Prefers evening calls." : undefined,
            createdAt: new Date("2025-09-01T00:00:00Z"),
            contact: {
              create: {
                organizationId: org,
                name,
                phone: `+91900000${String(i + 1).padStart(4, "0")}`,
                email: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`,
                kind,
                city: cities[i % 10],
                state:
                  cities[i % 10] === "Bengaluru"
                    ? "Karnataka"
                    : cities[i % 10] === "Kochi"
                      ? "Kerala"
                      : cities[i % 10] === "Hyderabad"
                        ? "Telangana"
                        : "Tamil Nadu",
                address:
                  i === 0
                    ? "Anna Nagar, Chennai, Tamil Nadu – 600040"
                    : undefined,
                occupation:
                  kind === "Individual" ? "IT Professional" : undefined,
                dob:
                  kind === "Individual"
                    ? dateOnly(i === 3 ? "1990-09-04" : "1985-03-14")
                    : null,
                ...(kind === "Business"
                  ? { business: { create: { industry: "Services" } } }
                  : {}),
              },
            },
          },
        }),
      );
    }
    await tx.contactRelationship.create({
      data: {
        fromId: clients[0].contactId,
        toId: clients[26].contactId,
        type: "Spouse",
      },
    });
    for (const name of [
      "HNI",
      "Family",
      "Insurance",
      "Investment",
      "Home Loan",
    ]) {
      const t = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await tx.clientTag.create({
        data: { clientId: clients[0].id, tagId: t.id },
      });
    }
    const products = [];
    for (let i = 0; i < 14; i++) {
      const ci = i < 10 ? i : i === 13 ? 6 : 0,
        di = i < 10 ? i % 7 : i - 9;
      const d = definitions[di];
      const loan = d.category.includes("Loan"),
        investment = d.category === "Investment";
      const amount = [
        2450000, 1820000, 850000, 3500000, 4000000, 1200000, 5000000,
      ][di];
      const p = await tx.clientProduct.create({
        data: {
          organizationId: org,
          clientId: clients[ci].id,
          definitionId: d.id,
          identifier: `PV-${["LI", "HI", "VI", "HL", "BI", "TI", "BL"][di]}-${String(i + 1).padStart(6, "0")}`,
          status: "Active",
          premiumMinor: loan || investment ? null : BigInt(amount),
          principalMinor: loan ? 425000000n : investment ? 50000000n : null,
          expectedCommissionMinor:
            loan || investment ? 0n : BigInt(Math.round(amount * 0.05)),
          startDate: dateOnly("2025-09-04"),
          ...(loan
            ? { loanDetails: { interestBasisPoints: 850, termMonths: 240 } }
            : investment
              ? {
                  investmentDetails: {
                    units: "100",
                    maturityDate: "2028-09-04",
                  },
                }
              : {
                  insuranceDetails: {
                    sumAssuredMinor: "100000000",
                    termYears: 20,
                  },
                }),
        },
      });
      products.push(p);
      const date = [
        "2026-09-04",
        "2026-09-07",
        "2026-09-12",
        "2026-09-15",
        "2026-09-25",
        "2026-10-01",
        "2026-10-05",
        "2026-10-10",
        "2026-09-18",
        "2026-09-27",
        "2027-01-14",
        "2026-10-02",
        "2026-09-20",
        "2026-08-30",
      ][i];
      await tx.financialEvent.create({
        data: {
          organizationId: org,
          clientId: clients[ci].id,
          productId: p.id,
          type: loan
            ? "Loan instalment"
            : investment
              ? "Bond interest"
              : "Insurance renewal",
          dueDate: dateOnly(date),
          amountMinor: investment ? 1000000n : BigInt(amount),
          amountMeaning: loan
            ? "Instalment due"
            : investment
              ? "Interest receivable"
              : "Premium due",
          recurrenceMonths: loan ? 1 : 12,
        },
      });
    }
    for (let i = 0; i < 24; i++) {
      const ci = i < 10 ? i : i % names.length;
      const due = new Date(
        `2026-09-${String(i < 3 ? 3 : i < 6 ? 4 : i < 10 ? 5 : i < 16 ? 6 : 10).padStart(2, "0")}T${i % 2 ? "10:00" : "04:30"}:00Z`,
      );
      await tx.followUp.create({
        data: {
          organizationId: org,
          clientId: clients[ci].id,
          productId: products.find((p) => p.clientId === clients[ci].id)?.id,
          ownerId: owner,
          channel: ["Call", "WhatsApp", "Meeting", "Email"][i % 4],
          dueAt: due,
          notes: [
            "Discuss renewal. Share new plan options.",
            "Send document checklist.",
            "Discuss loan eligibility and documents.",
            "Follow up on quotation.",
            "Share updated report.",
            "Send renewal reminder.",
          ][i % 6],
          state: i >= 20 ? "completed" : "pending",
          outcome: i >= 20 ? "Connected" : null,
          completedAt: i >= 20 ? now() : null,
        },
      });
    }
    let idx = 0;
    for (const [si, count] of [5, 5, 4, 3, 4, 2].entries()) {
      for (let n = 0; n < count; n++) {
        const ci = (10 + idx) % 26,
          di = idx % 7;
        const o = await tx.opportunity.create({
          data: {
            organizationId: org,
            clientId: clients[ci].id,
            ownerId: owner,
            requirement: definitions[di].category,
            stage: stages[si],
            createdAt: new Date("2026-09-01T05:30:00Z"),
            priority: idx % 4 === 0 ? "High" : "Normal",
            source: ["Website", "Referral", "Call", "WhatsApp", "Meeting"][
              idx % 5
            ],
            nextAction: "Discuss requirements and share suitable options",
            nextFollowUp: new Date("2026-09-08T05:30:00Z"),
            lostReason: si === 5 ? "Went with another provider" : null,
            history: {
              create: {
                toStage: stages[si],
                actorId: owner,
                reason: "Synthetic demo scenario",
                createdAt: new Date("2026-09-01T05:30:00Z"),
              },
            },
          },
        });
        if (si === 4)
          await tx.clientProduct.create({
            data: {
              organizationId: org,
              clientId: clients[ci].id,
              definitionId: definitions[di].id,
              opportunityId: o.id,
              identifier: `APP-${idx}`,
              startDate: dateOnly("2026-09-01"),
            },
          });
        idx++;
      }
    }
    for (let i = 0; i < 7; i++) {
      await tx.communication.create({
        data: {
          clientId: clients[i].id,
          channel: ["Call", "WhatsApp", "Email"][i % 3],
          event: "Manual outcome",
          body: "Connected; discussed financial requirements.",
          actorId: owner,
          createdAt: new Date(`2026-09-0${(i % 3) + 1}T05:30:00Z`),
        },
      });
      await tx.activity.create({
        data: {
          organizationId: org,
          actorId: owner,
          action: "create",
          entityType: "Client",
          entityId: clients[i].id,
          summary: [
            "Call outcome recorded",
            "Follow-up scheduled",
            "New client added",
            "Opportunity created",
            "Client details updated",
            "Product added",
            "Renewal scheduled",
          ][i],
          createdAt: new Date(`2026-09-0${4 - (i % 3)}T0${5 - (i % 4)}:00:00Z`),
        },
      });
    }
    await tx.note.create({
      data: {
        clientId: clients[0].id,
        body: "Discuss family protection and review current cover at the next meeting.",
        authorId: owner,
      },
    });
    await tx.notification.create({
      data: {
        organizationId: org,
        userId: owner,
        title: "Your relationship workspace is ready",
        link: "/dashboard",
      },
    });
  },
  { timeout: 30000 },
);
console.log(
  "Seeded deterministic synthetic workspace: 30 clients, 23 opportunities, 18 products, 14 events, 24 follow-ups.",
);
await db.$disconnect();
