import "dotenv/config";
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Builds a fixed-date UTC Date so `@db.Time()` stores exactly this
// wall-clock value as Asia/Dhaka time (see the note above RefreshmentRule
// in schema.prisma). Always constructed with an explicit "Z" - never from a
// local-time string - so the stored hour doesn't shift with the machine's
// own timezone.
function dhakaTime(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00Z`);
}

async function main() {
  // ---- Rooms ---------------------------------------------------------
  // NOTE: capacity, location, and description below are placeholder values
  // - replace with real figures once confirmed.
  const roomData = [
    {
      name: "PADMA",
      location: "3rd Floor, Head Office",
      capacity: 20,
      description:
        "Largest meeting room on the floor, suited for department-wide meetings.",
    },
    {
      name: "MEGHNA",
      location: "2nd Floor, Head Office",
      capacity: 12,
      description: "Mid-sized room for team meetings and client calls.",
    },
    {
      name: "JAMUNA",
      location: "2nd Floor, Head Office",
      capacity: 6,
      description: "Small room for quick huddles and one-on-ones.",
    },
  ];
  const rooms: Record<string, { id: string }> = {};
  for (const r of roomData) {
    rooms[r.name] = await prisma.room.upsert({
      where: { name: r.name },
      update: {
        location: r.location,
        capacity: r.capacity,
        description: r.description,
      },
      create: r,
    });
  }

  // ---- Facilities ------------------------------------------------------
  const facilityNames = [
    "Projector",
    "Air Conditioning",
    "Whiteboard",
    "Video Conference Unit",
    "Speakerphone",
    "WiFi",
    "TV Display",
    "Podium",
  ];
  const facilities: Record<string, { id: string }> = {};
  for (const name of facilityNames) {
    facilities[name] = await prisma.facility.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---- Attendee types ----------------------------------------------------
  const attendeeTypeNames = [
    "Internal Staff",
    "External Local Guest",
    "Foreign Guest",
    "Third Party Vendor",
  ];
  const attendeeTypes: Record<string, { id: string }> = {};
  for (const name of attendeeTypeNames) {
    attendeeTypes[name] = await prisma.attendeeType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---- Refreshment items -------------------------------------------------
  const refreshmentItemData = [
    { name: "Tea", category: "BEVERAGE" as const },
    { name: "Coffee", category: "BEVERAGE" as const },
    { name: "Biscuits", category: "SNACK" as const },
    { name: "Sandwiches", category: "SNACK" as const },
    { name: "Lunch Box", category: "MEAL" as const },
    { name: "Dinner Set", category: "MEAL" as const },
    { name: "Bottled Water", category: "BEVERAGE" as const },
    { name: "Fresh Juice", category: "BEVERAGE" as const },
  ];
  const refreshmentItems: Record<string, { id: string }> = {};
  for (const item of refreshmentItemData) {
    refreshmentItems[item.name] = await prisma.refreshmentItem.upsert({
      where: { name: item.name },
      update: { category: item.category },
      create: item,
    });
  }

  // ---- Room facilities ---------------------------------------------------
  // A deliberately uneven spread: PADMA is the best-equipped room, JAMUNA
  // the sparsest, so NOT_AVAILABLE (and one OUT_OF_ORDER) actually show up
  // in the seed data instead of every room looking identical.
  type RoomFacilitySeed = {
    room: string;
    facility: string;
    status: "AVAILABLE" | "NOT_AVAILABLE" | "OUT_OF_ORDER";
    note?: string;
  };
  const roomFacilityData: RoomFacilitySeed[] = [
    // PADMA - fully equipped
    { room: "PADMA", facility: "Projector", status: "AVAILABLE" },
    { room: "PADMA", facility: "Air Conditioning", status: "AVAILABLE" },
    { room: "PADMA", facility: "Whiteboard", status: "AVAILABLE" },
    { room: "PADMA", facility: "Video Conference Unit", status: "AVAILABLE" },
    { room: "PADMA", facility: "Speakerphone", status: "AVAILABLE" },
    { room: "PADMA", facility: "WiFi", status: "AVAILABLE" },
    { room: "PADMA", facility: "TV Display", status: "AVAILABLE" },
    { room: "PADMA", facility: "Podium", status: "AVAILABLE" },
    // MEGHNA - decent, missing a couple of items it never had
    { room: "MEGHNA", facility: "Projector", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "Air Conditioning", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "Whiteboard", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "Video Conference Unit", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "Speakerphone", status: "NOT_AVAILABLE" },
    { room: "MEGHNA", facility: "WiFi", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "TV Display", status: "AVAILABLE" },
    { room: "MEGHNA", facility: "Podium", status: "NOT_AVAILABLE" },
    // JAMUNA - smallest and sparsest; its projector is broken, not missing
    {
      room: "JAMUNA",
      facility: "Projector",
      status: "OUT_OF_ORDER",
      note: "Bulb needs replacement, reported 12 Aug",
    },
    { room: "JAMUNA", facility: "Air Conditioning", status: "AVAILABLE" },
    { room: "JAMUNA", facility: "Whiteboard", status: "AVAILABLE" },
    { room: "JAMUNA", facility: "Video Conference Unit", status: "NOT_AVAILABLE" },
    { room: "JAMUNA", facility: "Speakerphone", status: "NOT_AVAILABLE" },
    { room: "JAMUNA", facility: "WiFi", status: "AVAILABLE" },
    { room: "JAMUNA", facility: "TV Display", status: "NOT_AVAILABLE" },
    { room: "JAMUNA", facility: "Podium", status: "NOT_AVAILABLE" },
  ];
  for (const rf of roomFacilityData) {
    const roomId = rooms[rf.room].id;
    const facilityId = facilities[rf.facility].id;
    await prisma.roomFacility.upsert({
      where: { roomId_facilityId: { roomId, facilityId } },
      update: { status: rf.status, note: rf.note ?? null },
      create: { roomId, facilityId, status: rf.status, note: rf.note },
    });
  }

  // ---- Refreshment rules --------------------------------------------------
  // The spec's starter table lists 7 named rules, but several of them serve
  // more than one item (e.g. "Morning tea" -> Tea, Coffee, Biscuits). Since
  // the schema stores exactly one refreshmentItemId per rule row, each named
  // rule below expands into one row per item it serves - every row for the
  // same named rule shares its window/trigger/duration/attendeeType/priority.
  //
  // RefreshmentRule has no natural unique business key (unlike the tables
  // above), so each row is upserted by an explicit, deterministic id instead
  // of a @@unique constraint - that's what keeps this section safe to re-run.
  //
  // Priorities are a starting point, not a final decision - editable through
  // the super admin UI on Day 7.
  const PRIORITY_GUEST_HOSPITALITY = 20;
  const PRIORITY_MEAL = 10;
  const PRIORITY_LONG_MEETING_REFILL = 5;

  type RuleSeed = {
    id: string;
    name: string;
    from: string;
    to: string;
    trigger: "MEETING_OVERLAPS_WINDOW" | "MEETING_STARTS_IN_WINDOW";
    minDuration: number;
    attendeeType?: string;
    item: string;
    priority: number;
  };

  const ruleData: RuleSeed[] = [
    { id: "morning-tea-tea", name: "Morning tea", from: "09:00", to: "11:00", trigger: "MEETING_STARTS_IN_WINDOW", minDuration: 30, item: "Tea", priority: PRIORITY_MEAL },
    { id: "morning-tea-coffee", name: "Morning tea", from: "09:00", to: "11:00", trigger: "MEETING_STARTS_IN_WINDOW", minDuration: 30, item: "Coffee", priority: PRIORITY_MEAL },
    { id: "morning-tea-biscuits", name: "Morning tea", from: "09:00", to: "11:00", trigger: "MEETING_STARTS_IN_WINDOW", minDuration: 30, item: "Biscuits", priority: PRIORITY_MEAL },

    { id: "lunch-lunchbox", name: "Lunch", from: "12:30", to: "14:30", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 60, item: "Lunch Box", priority: PRIORITY_MEAL },

    { id: "afternoon-snacks-tea", name: "Afternoon snacks", from: "15:00", to: "17:00", trigger: "MEETING_STARTS_IN_WINDOW", minDuration: 45, item: "Tea", priority: PRIORITY_MEAL },
    { id: "afternoon-snacks-sandwiches", name: "Afternoon snacks", from: "15:00", to: "17:00", trigger: "MEETING_STARTS_IN_WINDOW", minDuration: 45, item: "Sandwiches", priority: PRIORITY_MEAL },

    { id: "dinner-dinnerset", name: "Dinner", from: "19:00", to: "21:00", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 60, item: "Dinner Set", priority: PRIORITY_MEAL },

    { id: "guest-water-bottledwater", name: "Guest water", from: "00:00", to: "23:59", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 0, attendeeType: "External Local Guest", item: "Bottled Water", priority: PRIORITY_GUEST_HOSPITALITY },

    { id: "foreign-guest-hospitality-water", name: "Foreign guest hospitality", from: "00:00", to: "23:59", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 0, attendeeType: "Foreign Guest", item: "Bottled Water", priority: PRIORITY_GUEST_HOSPITALITY },
    { id: "foreign-guest-hospitality-juice", name: "Foreign guest hospitality", from: "00:00", to: "23:59", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 0, attendeeType: "Foreign Guest", item: "Fresh Juice", priority: PRIORITY_GUEST_HOSPITALITY },

    { id: "long-meeting-refill-tea", name: "Long meeting refill", from: "00:00", to: "23:59", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 180, item: "Tea", priority: PRIORITY_LONG_MEETING_REFILL },
    { id: "long-meeting-refill-coffee", name: "Long meeting refill", from: "00:00", to: "23:59", trigger: "MEETING_OVERLAPS_WINDOW", minDuration: 180, item: "Coffee", priority: PRIORITY_LONG_MEETING_REFILL },
  ];

  for (const rule of ruleData) {
    const attendeeTypeId = rule.attendeeType
      ? attendeeTypes[rule.attendeeType].id
      : null;
    const refreshmentItemId = refreshmentItems[rule.item].id;
    const fields = {
      name: rule.name,
      appliesFromTime: dhakaTime(rule.from),
      appliesToTime: dhakaTime(rule.to),
      triggerMode: rule.trigger,
      minDurationMinutes: rule.minDuration,
      attendeeTypeId,
      refreshmentItemId,
      priority: rule.priority,
    };
    await prisma.refreshmentRule.upsert({
      where: { id: rule.id },
      update: fields,
      create: { id: rule.id, ...fields },
    });
  }

  // ---- Test users ----------------------------------------------------
  // Obviously fake identities, @example.com only - no real BSRM data. All
  // five share one simple password for convenience during development.
  // Read from SEED_PASSWORD so the actual value never lives in source
  // control - falls back to a known default if the env var isn't set.
  const TEST_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const userData = [
    { name: "Admin User", email: "admin@example.com", role: "SUPER_ADMIN" as const, department: "IT" },
    { name: "Alice Rahman", email: "alice.admin@example.com", role: "LOCAL_ADMIN" as const, department: "Administration" },
    { name: "Bilal Hossain", email: "bilal.admin@example.com", role: "LOCAL_ADMIN" as const, department: "Administration" },
    { name: "Chloe Karim", email: "chloe.employee@example.com", role: "EMPLOYEE" as const, department: "Finance" },
    { name: "David Islam", email: "david.employee@example.com", role: "EMPLOYEE" as const, department: "Marketing" },
  ];

  for (const u of userData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        department: u.department,
        passwordHash,
      },
      create: { ...u, passwordHash },
    });
  }

  writeFileSync(
    "TEST_ACCOUNTS.md",
    [
      "# Test accounts (Day 2 seed data)",
      "",
      "Demo accounts only - fake names, @example.com addresses, no real BSRM data.",
      "This file is gitignored and regenerated every time the seed script runs.",
      "",
      `**Password (all accounts):** \`${TEST_PASSWORD}\``,
      "",
      "| Name | Email | Role |",
      "|---|---|---|",
      ...userData.map((u) => `| ${u.name} | ${u.email} | ${u.role} |`),
      "",
    ].join("\n"),
  );

  // ---- Summary ---------------------------------------------------------
  const [
    roomCount,
    facilityCount,
    roomFacilityCount,
    attendeeTypeCount,
    refreshmentItemCount,
    refreshmentRuleCount,
    userCount,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.facility.count(),
    prisma.roomFacility.count(),
    prisma.attendeeType.count(),
    prisma.refreshmentItem.count(),
    prisma.refreshmentRule.count(),
    prisma.user.count(),
  ]);

  console.log("Seed complete:");
  console.log(`  Rooms:             ${roomCount}`);
  console.log(`  Facilities:        ${facilityCount}`);
  console.log(`  Room facilities:   ${roomFacilityCount}`);
  console.log(`  Attendee types:    ${attendeeTypeCount}`);
  console.log(`  Refreshment items: ${refreshmentItemCount}`);
  console.log(`  Refreshment rules: ${refreshmentRuleCount}`);
  console.log(`  Users:             ${userCount}`);
  console.log("Test account credentials written to TEST_ACCOUNTS.md");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
