/**
 * Seeds a realistic development dataset for Northern Rep, a fictional
 * theatre company running four productions.
 *
 * Idempotent: it clears every domain table first, so `npm run db:seed` can
 * be re-run at any time. It refuses to touch a production database.
 *
 * Dates are computed relative to *today* rather than hardcoded, so the app
 * always has a live "Today" panel and a plausible on-now/next call whenever
 * the seed is run — see docs/adr/0004-callboard-domain.md.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import * as schema from "./schema";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production database.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

/* -------------------------------------------------------------------------
 * Date helpers — everything below is relative to the moment the seed runs.
 * ---------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

/** Midnight of the Monday on/before `now`, offset by `weeks` (may be negative). */
function mondayOf(weeks: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay() || 7; // Sunday -> 7
  d.setDate(d.getDate() - (dow - 1) + weeks * 7);
  return d;
}

/** `base` plus a day offset and an "HH:mm" time. */
function at(base: Date, dayOffset: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base.getTime() + dayOffset * DAY);
  d.setHours(h!, m!, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY);
}

function dateOnly(daysFromNow: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

async function seed() {
  console.log("Clearing existing data…");
  await db.execute(
    sql`truncate table
      "activity_entry", "meeting_action", "meeting_minute", "meeting",
      "task", "schedule_call", "budget_line", "department_doc",
      "department_note", "department", "show",
      "organization_member", "organization",
      "session", "account", "user"
      restart identity cascade`,
  );

  console.log("Creating users…");
  const [priya, karl, ines, ravi, joy, nadia, amara] = await db
    .insert(schema.users)
    .values([
      { name: "Priya Chandran", email: "producer@northernrep.example" },
      { name: "Karl Doyle", email: "karl@northernrep.example" },
      { name: "Ines Marchetti", email: "ines@northernrep.example" },
      { name: "Ravi Menon", email: "ravi@northernrep.example" },
      { name: "Joy Adebayo", email: "joy@northernrep.example" },
      { name: "Nadia Osei", email: "nadia@northernrep.example" },
      { name: "Amara Blake", email: "amara@northernrep.example" },
    ])
    .returning();

  if (!priya || !karl || !ines || !ravi || !joy || !nadia || !amara) {
    throw new Error("Seed users were not created");
  }

  console.log("Creating the organization…");
  const [org] = await db
    .insert(schema.organizations)
    .values({ name: "Northern Rep", currency: "£" })
    .returning();
  if (!org) throw new Error("Organization was not created");

  await db.insert(schema.organizationMembers).values([
    { organizationId: org.id, userId: priya.id, role: "owner" },
    { organizationId: org.id, userId: karl.id, role: "admin" },
    { organizationId: org.id, userId: ines.id, role: "member" },
    { organizationId: org.id, userId: ravi.id, role: "member" },
    { organizationId: org.id, userId: joy.id, role: "member" },
    { organizationId: org.id, userId: nadia.id, role: "member" },
    { organizationId: org.id, userId: amara.id, role: "viewer" },
  ]);

  console.log("Creating shows…");
  const [wintersTale, sweeneyTodd, peterPan, smallIsland] = await db
    .insert(schema.shows)
    .values([
      {
        organizationId: org.id,
        title: "The Winter's Tale",
        venue: "Main House",
        openDate: dateOnly(35),
        closeDate: dateOnly(63),
        phase: "Production week",
        state: "risk",
        director: "Amara Blake",
        designer: "Sofia Reyes",
        companySize: 34,
        flagsSummary: "2 flags · AV spec, RF mics",
      },
      {
        organizationId: org.id,
        title: "Sweeney Todd",
        venue: "Grand Theatre",
        openDate: dateOnly(77),
        closeDate: dateOnly(105),
        phase: "Build",
        state: "ok",
        director: "Peter Nwosu",
        designer: "Sofia Reyes",
        companySize: 41,
        flagsSummary: "On plan",
      },
      {
        organizationId: org.id,
        title: "Peter Pan",
        venue: "Main House",
        openDate: dateOnly(91),
        closeDate: dateOnly(126),
        phase: "Design sign-off",
        state: "warn",
        director: "Lucy Farrow",
        designer: "Dan Okoye",
        companySize: 52,
        flagsSummary: "1 flag · flying supplier",
      },
      {
        organizationId: org.id,
        title: "Small Island",
        venue: "Studio 2",
        openDate: dateOnly(133),
        closeDate: dateOnly(154),
        phase: "Pre-production",
        state: "ok",
        director: "Amara Blake",
        designer: "Priya Raman",
        companySize: 19,
        flagsSummary: "On plan",
      },
    ])
    .returning();

  if (!wintersTale || !sweeneyTodd || !peterPan || !smallIsland) {
    throw new Error("Seed shows were not created");
  }

  /* -----------------------------------------------------------------------
   * The Winter's Tale — full depth, matching the design mockup.
   * -------------------------------------------------------------------- */

  console.log("Building out The Winter's Tale…");

  const [lighting, sound, av, staging, costume] = await db
    .insert(schema.departments)
    .values([
      {
        showId: wintersTale.id,
        name: "Lighting",
        headName: "Ines Marchetti, LX Designer",
        secondName: "Chief LX Tom Ayre",
        status: "On track",
        state: "ok",
      },
      {
        showId: wintersTale.id,
        name: "Sound",
        headName: "Ravi Menon, Sound Designer",
        secondName: "No.1 Ellie Frost",
        status: "Needs attention",
        state: "warn",
      },
      {
        showId: wintersTale.id,
        name: "AV",
        headName: "Joy Adebayo, Video Designer",
        secondName: "Programmer TBC",
        status: "At risk",
        state: "risk",
      },
      {
        showId: wintersTale.id,
        name: "Staging",
        headName: "Karl Doyle, Production Manager",
        secondName: "Construction Stage One",
        status: "On track",
        state: "ok",
      },
      {
        showId: wintersTale.id,
        name: "Costume",
        headName: "Nadia Osei, Costume Supervisor",
        secondName: "Wardrobe Mistress Cara Ng",
        status: "On track",
        state: "ok",
      },
    ])
    .returning();

  if (!lighting || !sound || !av || !staging || !costume)
    throw new Error("Departments were not created");

  await db.insert(schema.budgetLines).values([
    {
      showId: wintersTale.id,
      departmentId: staging.id,
      name: "Staging & set",
      allocated: 82000,
      committed: 74500,
      spent: 61200,
      position: 0,
    },
    {
      showId: wintersTale.id,
      departmentId: lighting.id,
      name: "Lighting",
      allocated: 38000,
      committed: 35900,
      spent: 33100,
      position: 1,
    },
    {
      showId: wintersTale.id,
      departmentId: costume.id,
      name: "Costume",
      allocated: 34000,
      committed: 33200,
      spent: 28700,
      position: 2,
    },
    {
      showId: wintersTale.id,
      departmentId: null,
      name: "Crew & overtime",
      allocated: 28000,
      committed: 19000,
      spent: 14300,
      position: 3,
    },
    {
      showId: wintersTale.id,
      departmentId: sound.id,
      name: "Sound",
      allocated: 24000,
      committed: 22400,
      spent: 22400,
      position: 4,
    },
    {
      showId: wintersTale.id,
      departmentId: av.id,
      name: "AV & video",
      allocated: 16000,
      committed: 9800,
      spent: 6500,
      position: 5,
    },
    {
      showId: wintersTale.id,
      departmentId: null,
      name: "Props",
      allocated: 12000,
      committed: 10600,
      spent: 9900,
      position: 6,
    },
    {
      showId: wintersTale.id,
      departmentId: null,
      name: "Contingency",
      allocated: 14000,
      committed: 4200,
      spent: 4200,
      position: 7,
    },
  ]);

  await db.insert(schema.departmentNotes).values([
    {
      departmentId: lighting.id,
      authorId: ines.id,
      body: "Plot v4 adds six movers on LX3. Power budget re-checked against the house limit — 4.2kW headroom remaining, no extra distro needed.",
      createdAt: daysAgo(1),
    },
    {
      departmentId: lighting.id,
      authorId: priya.id,
      body: "Focus session Tue from 16:00. Needs two crew and the tallescope; SM to keep the stage clear.",
      createdAt: daysAgo(4),
    },
    {
      departmentId: lighting.id,
      authorId: karl.id,
      body: "House rig strike agreed with the venue for Sunday, 08:00 start.",
      createdAt: daysAgo(6),
    },
    {
      departmentId: sound.id,
      authorId: ravi.id,
      body: "RF licence approved for channels 38–42. Scan on the get-in to confirm no clash with the venue's paging.",
      createdAt: daysAgo(0),
    },
    {
      departmentId: sound.id,
      authorId: ravi.id,
      body: "Two DPA 4061s failed the bench test and need replacing before dress. Quote in at £310 the pair.",
      createdAt: daysAgo(1),
    },
    {
      departmentId: av.id,
      authorId: joy.id,
      body: "Projector spec still unconfirmed. 12,000 lumen quoted at £4,800 for the run — needs sign-off by Friday or the hire slot goes.",
      createdAt: daysAgo(0),
    },
    {
      departmentId: av.id,
      authorId: joy.id,
      body: "Surface test on the upstage gauze passed at 60% output. Keystone correction handled in the media server.",
      createdAt: daysAgo(7),
    },
    {
      departmentId: staging.id,
      authorId: karl.id,
      body: "Revised flying plot approved — two additional Kirby flights, +£3,400 drawn from contingency.",
      createdAt: daysAgo(0),
    },
    {
      departmentId: staging.id,
      authorId: priya.id,
      body: "Steel deck arrives Friday 07:00. Four crew needed for the unload; loading bay booked with the venue.",
      createdAt: daysAgo(1),
    },
    {
      departmentId: staging.id,
      authorId: priya.id,
      body: "Weight test certificate still outstanding from Stage One. Chased twice.",
      createdAt: daysAgo(4),
    },
    {
      departmentId: costume.id,
      authorId: nadia.id,
      body: "Principal fitting moved to Thursday 15:00 in Studio 2 to clear the tech call.",
      createdAt: daysAgo(0),
    },
    {
      departmentId: costume.id,
      authorId: nadia.id,
      body: "Dye run for the Act 2 chorus booked Monday. Three fabrics, sample approved by the designer.",
      createdAt: daysAgo(1),
    },
  ]);

  await db.insert(schema.departmentDocs).values([
    {
      departmentId: lighting.id,
      name: "LX plot v4",
      ext: "PDF",
      sizeLabel: "2.4 MB",
      uploadedAt: daysAgo(1),
    },
    {
      departmentId: lighting.id,
      name: "Rig plan LX1–LX5",
      ext: "DWG",
      sizeLabel: "8.1 MB",
      uploadedAt: daysAgo(9),
    },
    {
      departmentId: lighting.id,
      name: "Hire schedule — White Light",
      ext: "XLSX",
      sizeLabel: "112 KB",
      uploadedAt: daysAgo(13),
    },
    {
      departmentId: sound.id,
      name: "Mic plot & radio allocation",
      ext: "PDF",
      sizeLabel: "640 KB",
      uploadedAt: daysAgo(5),
    },
    {
      departmentId: sound.id,
      name: "QLab session notes",
      ext: "MD",
      sizeLabel: "12 KB",
      uploadedAt: daysAgo(6),
    },
    {
      departmentId: sound.id,
      name: "RF licence 38–42",
      ext: "PDF",
      sizeLabel: "88 KB",
      uploadedAt: daysAgo(0),
    },
    {
      departmentId: av.id,
      name: "Projection surface test",
      ext: "PDF",
      sizeLabel: "1.8 MB",
      uploadedAt: daysAgo(7),
    },
    {
      departmentId: av.id,
      name: "Content delivery schedule",
      ext: "XLSX",
      sizeLabel: "64 KB",
      uploadedAt: daysAgo(10),
    },
    {
      departmentId: staging.id,
      name: "Flying plot v3",
      ext: "PDF",
      sizeLabel: "3.2 MB",
      uploadedAt: daysAgo(0),
    },
    {
      departmentId: staging.id,
      name: "Deck build drawings",
      ext: "PDF",
      sizeLabel: "6.7 MB",
      uploadedAt: daysAgo(13),
    },
    {
      departmentId: staging.id,
      name: "Weight test certificate",
      ext: "PDF",
      sizeLabel: null,
      uploadedAt: null,
    },
    {
      departmentId: costume.id,
      name: "Costume bible",
      ext: "PDF",
      sizeLabel: "14 MB",
      uploadedAt: daysAgo(15),
    },
    {
      departmentId: costume.id,
      name: "Fitting schedule",
      ext: "XLSX",
      sizeLabel: "96 KB",
      uploadedAt: daysAgo(0),
    },
  ]);

  const thisMonday = mondayOf(0);
  await db.insert(schema.scheduleCalls).values([
    {
      showId: wintersTale.id,
      title: "Get-in & fit-up",
      startAt: at(thisMonday, 0, "08:00"),
      endAt: at(thisMonday, 0, "18:00"),
      location: "Main House",
      departmentsLabel: "Staging, Lighting",
      note: "Deck lays first; no LX rig before 14:00. Loading bay booked all day.",
    },
    {
      showId: wintersTale.id,
      title: "LX rig & focus",
      startAt: at(thisMonday, 1, "08:00"),
      endAt: at(thisMonday, 1, "20:00"),
      location: "Main House",
      departmentsLabel: "Lighting",
      note: "Focus with Ines from 16:00. Two crew + tallescope.",
    },
    {
      showId: wintersTale.id,
      title: "Sound rig / QLab build",
      startAt: at(thisMonday, 2, "09:00"),
      endAt: at(thisMonday, 2, "18:00"),
      location: "Main House",
      departmentsLabel: "Sound, AV",
      note: "Mics 1–12 bench-checked before tech. RF scan on arrival.",
    },
    {
      showId: wintersTale.id,
      title: "Tech rehearsal — Act 1",
      startAt: at(thisMonday, 3, "10:00"),
      endAt: at(thisMonday, 3, "22:00"),
      location: "Main House",
      departmentsLabel: "All departments",
      note: "Company call 10:00. Break 14:00–15:00. Costume fitting runs parallel in Studio 2.",
    },
    {
      showId: wintersTale.id,
      title: "Tech rehearsal — Act 2",
      startAt: at(thisMonday, 4, "10:00"),
      endAt: at(thisMonday, 4, "22:00"),
      location: "Main House",
      departmentsLabel: "All departments",
      note: "Steel deck delivery 07:00 ahead of the call.",
    },
    {
      showId: wintersTale.id,
      title: "Dress rehearsal",
      startAt: at(thisMonday, 5, "13:00"),
      endAt: at(thisMonday, 5, "18:00"),
      location: "Main House",
      departmentsLabel: "All departments",
      note: "Running crew confirmed. Wardrobe on quick-change plot.",
    },
    {
      showId: wintersTale.id,
      title: "Final dress & photo call",
      startAt: at(thisMonday, 7, "14:00"),
      endAt: at(thisMonday, 7, "21:00"),
      location: "Main House",
      departmentsLabel: "All departments",
      note: "Photographer 16:00, 45 minutes on stage.",
    },
    {
      showId: wintersTale.id,
      title: "Press night",
      startAt: at(thisMonday, 8, "19:30"),
      endAt: null,
      location: "Main House",
      departmentsLabel: "All departments",
      note: "Beginners 19:20. Front of house briefing 18:30.",
    },
  ]);

  await db.insert(schema.tasks).values([
    {
      showId: wintersTale.id,
      label: "Sign off AV projector spec before the hire slot lapses",
      ownerName: "Joy Adebayo",
      dueDate: dateOnly(4),
      tag: "at_risk",
      position: 0,
    },
    {
      showId: wintersTale.id,
      label: "Confirm four crew for the steel deck unload",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(3),
      tag: "urgent",
      position: 1,
    },
    {
      showId: wintersTale.id,
      label: "Circulate production schedule v6 to the company",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(0),
      tag: null,
      position: 2,
    },
    {
      showId: wintersTale.id,
      label: "Chase weight test certificate from Stage One",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(2),
      tag: "urgent",
      position: 3,
    },
    {
      showId: wintersTale.id,
      label: "Approve replacement DPA 4061s (£310)",
      ownerName: "Ravi Menon",
      dueDate: dateOnly(3),
      tag: null,
      position: 4,
    },
    {
      showId: wintersTale.id,
      label: "Book dye run studio for Act 2 chorus",
      ownerName: "Cara Ng",
      dueDate: dateOnly(-2),
      tag: null,
      done: true,
      doneAt: daysAgo(1),
      position: 5,
    },
  ]);

  const [pm7, pm6, pm5, pm4] = await db
    .insert(schema.meetings)
    .values([
      {
        showId: wintersTale.id,
        ref: "PM 7",
        scheduledAt: at(mondayOf(1), 0, "10:00"),
        endAt: at(mondayOf(1), 0, "11:30"),
        location: "Rehearsal Room 1",
        chairName: "Karl Doyle",
        minuteTakerName: "Ellie Frost",
        status: "scheduled",
        presentSummary: "Agenda not yet issued",
        apologiesSummary: "—",
      },
      {
        showId: wintersTale.id,
        ref: "PM 6",
        scheduledAt: at(mondayOf(0), 0, "10:00"),
        endAt: at(mondayOf(0), 0, "11:25"),
        location: "Rehearsal Room 1",
        chairName: "Karl Doyle",
        minuteTakerName: "Ellie Frost",
        status: "minutes_issued",
        presentSummary: "9 of 11",
        apologiesSummary: "Dan Okoye, Cara Ng",
      },
      {
        showId: wintersTale.id,
        ref: "PM 5",
        scheduledAt: at(mondayOf(-1), 0, "10:00"),
        endAt: at(mondayOf(-1), 0, "11:10"),
        location: "Rehearsal Room 1",
        chairName: "Karl Doyle",
        minuteTakerName: "Ellie Frost",
        status: "minutes_issued",
        presentSummary: "10 of 11",
        apologiesSummary: "Ines Marchetti",
      },
      {
        showId: wintersTale.id,
        ref: "PM 4",
        scheduledAt: at(mondayOf(-2), 0, "10:00"),
        endAt: at(mondayOf(-2), 0, "11:00"),
        location: "Rehearsal Room 1",
        chairName: "Karl Doyle",
        minuteTakerName: "Ellie Frost",
        status: "minutes_issued",
        presentSummary: "11 of 11",
        apologiesSummary: "—",
      },
    ])
    .returning();

  if (!pm7 || !pm6 || !pm5 || !pm4) throw new Error("Meetings were not created");

  await db.insert(schema.meetingMinutes).values([
    {
      meetingId: pm6.id,
      position: 0,
      item: "Matters arising from PM 5",
      note: "All four actions from PM 5 closed except the weight test certificate, which carries forward. Rehearsal room 2 booking confirmed for the parallel costume calls.",
    },
    {
      meetingId: pm6.id,
      position: 1,
      item: "Staging — flying plot",
      note: "Karl presented the revised plot. Two additional Kirby flights are needed for the Act 2 reveal at £3,400. Stage One confirmed the rig can take the load subject to the outstanding weight test.",
      decision: "Revised flying plot approved. £3,400 drawn from contingency.",
    },
    {
      meetingId: pm6.id,
      position: 2,
      item: "Staging — Act 2 reveal",
      note: "Automation of the SR truck was discussed against the remaining build time. Amara is content with a manual reveal if the crew track is rehearsed from the first tech.",
      decision: "SR truck runs manual. No automation.",
    },
    {
      meetingId: pm6.id,
      position: 3,
      item: "AV — projector spec",
      note: "Joy reported the 12,000 lumen unit is quoted at £4,800 for the run but the hire slot lapses Friday. Surface test on the upstage gauze passed at 60% output.",
    },
    {
      meetingId: pm6.id,
      position: 4,
      item: "Sound — radio mics",
      note: "RF licence approved for channels 38–42. Two DPA 4061s failed the bench test; replacements quoted at £310 the pair.",
    },
    {
      meetingId: pm6.id,
      position: 5,
      item: "Costume — fittings",
      note: "Principal fitting clashes with the Thursday tech call and will move to 15:00 in Studio 2. Dye run for the Act 2 chorus booked for Monday.",
    },
    {
      meetingId: pm6.id,
      position: 6,
      item: "Schedule",
      note: "Production schedule v6 agreed with the get-in sequenced deck first, no LX rig before 14:00 on Monday. Karl to circulate to all 34 company members.",
    },
    {
      meetingId: pm6.id,
      position: 7,
      item: "Health & safety",
      note: "Loading bay booked for the Friday steel delivery. Tallescope use restricted to the Tuesday focus session with two crew in attendance.",
    },

    {
      meetingId: pm5.id,
      position: 0,
      item: "Matters arising from PM 4",
      note: "Model box notes distributed. Props buying list agreed at £11,400 against a £12,000 allocation.",
    },
    {
      meetingId: pm5.id,
      position: 1,
      item: "Lighting",
      note: "Plot v4 adds six movers on LX3. Tom confirmed 4.2kW of headroom against the house limit, so no additional distro is required.",
      decision: "Plot v4 approved as drawn.",
    },
    {
      meetingId: pm5.id,
      position: 2,
      item: "Staging — build progress",
      note: "Stage One are two days behind on the deck but expect to recover before the Friday delivery. Weight test certificate outstanding.",
    },
    {
      meetingId: pm5.id,
      position: 3,
      item: "Costume",
      note: "Fabric samples for the Act 2 chorus approved by the designer. Dye run to be booked.",
    },
    {
      meetingId: pm5.id,
      position: 4,
      item: "Get-in sequencing",
      note: "Deck to lay before any LX work on the Monday. Venue technical manager notified.",
    },

    {
      meetingId: pm4.id,
      position: 0,
      item: "Model box showing",
      note: "Full model presented to the company. Two upstage entrances widened at the director's request; drawings to be revised.",
    },
    {
      meetingId: pm4.id,
      position: 1,
      item: "Budget review",
      note: "Allocation stands at £248,000 with £14,000 held as contingency. Staging is the largest line at £82,000.",
      decision: "Budget confirmed as board-approved.",
    },
    {
      meetingId: pm4.id,
      position: 2,
      item: "Props",
      note: "Buying list reviewed line by line and agreed at £11,400.",
    },
    {
      meetingId: pm4.id,
      position: 3,
      item: "AV",
      note: "Projection approach agreed in principle, subject to a surface test on the upstage gauze.",
    },
  ]);

  await db.insert(schema.meetingActions).values([
    {
      meetingId: pm6.id,
      position: 0,
      text: "Obtain sign-off on the AV projector spec before the hire slot lapses",
      ownerName: "Joy Adebayo",
      dueDate: dateOnly(4),
      tag: "at_risk",
    },
    {
      meetingId: pm6.id,
      position: 1,
      text: "Confirm four crew for the steel deck unload",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(3),
      tag: "urgent",
    },
    {
      meetingId: pm6.id,
      position: 2,
      text: "Chase the weight test certificate from Stage One",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(2),
      tag: "carried_forward",
    },
    {
      meetingId: pm6.id,
      position: 3,
      text: "Raise the purchase order for two replacement DPA 4061s",
      ownerName: "Ravi Menon",
      dueDate: dateOnly(3),
      tag: null,
    },
    {
      meetingId: pm6.id,
      position: 4,
      text: "Circulate production schedule v6 to the company",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(0),
      tag: null,
      done: true,
      doneAt: daysAgo(1),
    },
    {
      meetingId: pm6.id,
      position: 5,
      text: "Move the principal fitting to Thursday 15:00 and notify the company",
      ownerName: "Nadia Osei",
      dueDate: dateOnly(1),
      tag: null,
      done: true,
      doneAt: daysAgo(2),
    },

    {
      meetingId: pm5.id,
      position: 0,
      text: "Issue plot v4 to the hire company and update the hire schedule",
      ownerName: "Ines Marchetti",
      dueDate: dateOnly(-6),
      tag: null,
      done: true,
      doneAt: daysAgo(8),
    },
    {
      meetingId: pm5.id,
      position: 1,
      text: "Book the dye run studio for the Act 2 chorus",
      ownerName: "Cara Ng",
      dueDate: dateOnly(-4),
      tag: null,
      done: true,
      doneAt: daysAgo(5),
    },
    {
      meetingId: pm5.id,
      position: 2,
      text: "Obtain the weight test certificate from Stage One",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(-4),
      tag: "carried_forward",
    },
    {
      meetingId: pm5.id,
      position: 3,
      text: "Notify the venue of the revised get-in sequence",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(-7),
      tag: null,
      done: true,
      doneAt: daysAgo(9),
    },

    {
      meetingId: pm4.id,
      position: 0,
      text: "Revise the deck drawings for the widened upstage entrances",
      ownerName: "Karl Doyle",
      dueDate: dateOnly(-11),
      tag: null,
      done: true,
      doneAt: daysAgo(12),
    },
    {
      meetingId: pm4.id,
      position: 1,
      text: "Run the projection surface test on the upstage gauze",
      ownerName: "Joy Adebayo",
      dueDate: dateOnly(-8),
      tag: null,
      done: true,
      doneAt: daysAgo(7),
    },
    {
      meetingId: pm4.id,
      position: 2,
      text: "Distribute model box notes to all departments",
      ownerName: "Ellie Frost",
      dueDate: dateOnly(-13),
      tag: null,
      done: true,
      doneAt: daysAgo(14),
    },
  ]);

  await db.insert(schema.activityEntries).values([
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Staging",
      kind: "decision",
      text: "Revised flying plot approved — two additional Kirby flights, +£3,400 from contingency.",
      authorId: karl.id,
      createdAt: daysAgo(0),
    },
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Sound",
      kind: "update",
      text: "RF licence approved for channels 38–42.",
      authorId: ravi.id,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    },
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Staging",
      kind: "decision",
      text: "SR truck runs manual — no automation on the Act 2 reveal.",
      authorId: amara.id,
      createdAt: daysAgo(0),
    },
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Costume",
      kind: "update",
      text: "Principal fitting moved to Thursday 15:00, Studio 2.",
      authorId: nadia.id,
      createdAt: daysAgo(0),
    },
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Production",
      kind: "budget",
      text: "Contingency drawn £1,200 to Staging, approved by K. Doyle.",
      authorId: priya.id,
      createdAt: daysAgo(1),
    },
    {
      organizationId: org.id,
      showId: wintersTale.id,
      departmentName: "Lighting",
      kind: "update",
      text: "LX plot v4 uploaded, supersedes v3.",
      authorId: ines.id,
      createdAt: daysAgo(1),
    },
    {
      organizationId: org.id,
      showId: peterPan.id,
      departmentName: "Staging",
      kind: "decision",
      text: "Panto flying supplier deferred to the November board meeting.",
      authorId: priya.id,
      createdAt: daysAgo(2),
    },
    {
      organizationId: org.id,
      showId: smallIsland.id,
      departmentName: "Production",
      kind: "update",
      text: "Model box showing set for rehearsal room 1.",
      authorId: priya.id,
      createdAt: daysAgo(2),
    },
  ]);

  /* -----------------------------------------------------------------------
   * The other three shows — lighter but real, proving per-show scoping.
   * -------------------------------------------------------------------- */

  console.log("Adding lighter content for the other three shows…");

  const lighterShows = [sweeneyTodd, peterPan, smallIsland];
  for (const [index, show] of lighterShows.entries()) {
    const [showLighting, showStaging] = await db
      .insert(schema.departments)
      .values([
        {
          showId: show.id,
          name: "Lighting",
          headName: "Tom Ayre, Chief LX",
          status: "On track",
          state: "ok",
        },
        {
          showId: show.id,
          name: "Staging",
          headName: "Karl Doyle, Production Manager",
          status: "On track",
          state: "ok",
        },
      ])
      .returning();
    if (!showLighting || !showStaging) throw new Error("Departments were not created");

    await db.insert(schema.budgetLines).values([
      {
        showId: show.id,
        departmentId: showStaging.id,
        name: "Staging & set",
        allocated: 40000,
        committed: 12000,
        spent: 6000,
        position: 0,
      },
      {
        showId: show.id,
        departmentId: showLighting.id,
        name: "Lighting",
        allocated: 18000,
        committed: 4000,
        spent: 1500,
        position: 1,
      },
      {
        showId: show.id,
        departmentId: null,
        name: "Contingency",
        allocated: 6000,
        committed: 0,
        spent: 0,
        position: 2,
      },
    ]);

    await db.insert(schema.departmentNotes).values([
      {
        departmentId: showStaging.id,
        authorId: karl.id,
        body: `Initial build schedule drafted for ${show.title}.`,
        createdAt: daysAgo(3),
      },
    ]);

    const nextMonday = mondayOf(1);
    await db.insert(schema.scheduleCalls).values([
      {
        showId: show.id,
        title: "Design presentation",
        startAt: at(nextMonday, 1 + index, "10:00"),
        endAt: at(nextMonday, 1 + index, "12:00"),
        location: "Rehearsal Room 1",
        departmentsLabel: "All departments",
        note: "First look at the model box.",
      },
    ]);

    await db.insert(schema.tasks).values([
      {
        showId: show.id,
        label: `Confirm rehearsal room bookings for ${show.title}`,
        ownerName: "Karl Doyle",
        dueDate: dateOnly(10),
        tag: null,
        position: 0,
      },
    ]);
  }

  console.log(
    `Seeded ${org.name} with 4 shows (full depth on The Winter's Tale) and 7 users.\n` +
      `Sign in at http://localhost:3000/login as producer@northernrep.example`,
  );
}

try {
  await seed();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
