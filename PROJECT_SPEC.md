# BSRM Meeting Room Booking System — Project Specification

**Version:** 1.0
**Timeline:** 10 working days
**Purpose of this document:** This is the single source of truth for the project. It lives inside the project folder so that any AI coding assistant reads it and understands the full system on every request.

---

## 1. What the system does

Employees request a meeting room. A local admin reviews the request, checks capacity and facility needs, and assigns one of the available rooms. The system automatically works out what refreshments are needed based on the meeting's timing, duration, and who is attending. A super admin controls every underlying setting — rooms, facilities, refreshment rules, attendee categories, and users. After the meeting, attendees leave feedback on the room.

Currently three rooms exist: **PADMA**, **MEGHNA**, **JAMUNA**. Rooms are database records, not hardcoded values — adding a fourth room is a form submission by the super admin, requiring no code change. The same principle applies to facilities, refreshment items, refreshment rules, and attendee types.

---

## 2. Roles and permissions

### EMPLOYEE (regular internal user)
- Submit a meeting room request
- View own requests and their status
- Cancel own request (before it starts)
- Submit feedback after a meeting they attended
- View room details and facilities (read-only)

### LOCAL_ADMIN
Everything an Employee can do, plus:
- View the queue of pending requests
- Approve a request and assign a specific room
- Reject a request with a reason
- Reassign an approved booking to a different room
- Reschedule an approved booking (change date/time)
- Edit booking details (headcount, attendee mix, facility needs)
- Adjust the auto-generated refreshment list
- Flag a facility in a room as out of order
- View all bookings and all feedback

### SUPER_ADMIN
Everything a Local Admin can do, plus:
- Create, edit, deactivate rooms (name, capacity, location, description)
- Manage the master list of facilities and assign them to rooms with a status
- Manage refreshment items
- **Create and edit refreshment rules** (the automation logic)
- Manage attendee types
- Create, edit, deactivate users and change their roles
- View the audit log of all administrative actions
- View reports (room utilisation, feedback trends, refreshment volume)

**Implementation rule:** permissions must be enforced on the server, not just by hiding buttons in the interface. A user must not be able to perform an admin action by manipulating a request directly.

---

## 3. Database design

This is the foundation. Get this right and everything else is replaceable.

### User
| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| name | string | |
| email | string | unique, used for login |
| passwordHash | string | never store plain passwords |
| phone | string | optional |
| department | string | optional |
| role | enum | EMPLOYEE / LOCAL_ADMIN / SUPER_ADMIN |
| isActive | boolean | deactivate instead of deleting |
| createdAt | datetime | |

### Room
| Field | Type | Notes |
|---|---|---|
| id | string | primary key |
| name | string | PADMA, MEGHNA, JAMUNA |
| location | string | e.g. "3rd Floor, Head Office" |
| capacity | integer | set by super admin |
| description | string | free text shown to users |
| isActive | boolean | hide a room without deleting its history |

### Facility
Master list of possible equipment. Super admin manages this list.
| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | Projector, Air Conditioning, Whiteboard, Video Conference Unit, Speakerphone, WiFi, TV Display, Podium |
| isActive | boolean | |

### RoomFacility
Links a room to a facility **with a status**. This is how the system reports what a room has and what it is lacking.
| Field | Type | Notes |
|---|---|---|
| roomId | string | |
| facilityId | string | |
| status | enum | AVAILABLE / NOT_AVAILABLE / OUT_OF_ORDER |
| note | string | e.g. "Bulb needs replacement, reported 12 Aug" |

The room detail page must show three groups: what is available, what is temporarily out of order, and what the room does not have at all.

### AttendeeType
| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | Internal Staff / External Local Guest / Foreign Guest / Third Party Vendor |
| isActive | boolean | |

Super admin can add new categories later without a code change.

### Booking
| Field | Type | Notes |
|---|---|---|
| id | string | |
| requesterId | string | → User |
| title | string | meeting title |
| purpose | string | optional detail |
| startTime | datetime | |
| endTime | datetime | |
| totalAttendees | integer | |
| preferredRoomId | string | nullable — requester may suggest |
| assignedRoomId | string | nullable until approved — admin decides |
| status | enum | PENDING / APPROVED / REJECTED / CANCELLED / COMPLETED |
| requestedFacilities | relation | facilities the requester needs |
| reviewedById | string | which admin actioned it |
| reviewedAt | datetime | |
| adminNote | string | |
| rejectionReason | string | |
| createdAt / updatedAt | datetime | |

### BookingAttendeeGroup
Lets one meeting have a mix of attendee types (e.g. 8 internal + 2 foreign guests).
| Field | Type |
|---|---|
| bookingId | string |
| attendeeTypeId | string |
| count | integer |

### RefreshmentItem
| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | Tea, Coffee, Biscuits, Sandwiches, Lunch Box, Dinner Set, Bottled Water, Fresh Juice |
| category | enum | BEVERAGE / SNACK / MEAL |
| estimatedCostPerHead | decimal | optional, for reports |
| isActive | boolean | |

### RefreshmentRule
**This is the core automation, and it is fully editable by the super admin.** The rule engine reads these rows; it does not contain hardcoded times.
| Field | Type | Notes |
|---|---|---|
| id | string | |
| name | string | "Lunch for midday meetings" |
| appliesFromTime | time | e.g. 12:30 |
| appliesToTime | time | e.g. 14:30 |
| triggerMode | enum | MEETING_OVERLAPS_WINDOW / MEETING_STARTS_IN_WINDOW |
| minDurationMinutes | integer | e.g. 60 — ignore short meetings |
| attendeeTypeId | string | nullable = applies to everyone |
| refreshmentItemId | string | what to serve |
| qtyPerHead | decimal | usually 1 |
| priority | integer | higher priority rules win on conflict |
| isActive | boolean | |

**Starter rules to seed (super admin can change all of these):**

| Rule | Window | Trigger | Min duration | Applies to | Serves |
|---|---|---|---|---|---|
| Morning tea | 09:00–11:00 | starts in window | 30 min | all | Tea, Coffee, Biscuits |
| Lunch | 12:30–14:30 | overlaps window | 60 min | all | Lunch Box |
| Afternoon snacks | 15:00–17:00 | starts in window | 45 min | all | Tea, Sandwiches |
| Dinner | 19:00–21:00 | overlaps window | 60 min | all | Dinner Set |
| Guest water | any | overlaps window | 0 min | External Local Guest | Bottled Water |
| Foreign guest hospitality | any | overlaps window | 0 min | Foreign Guest | Bottled Water, Fresh Juice |
| Long meeting refill | any | overlaps window | 180 min | all | Tea, Coffee |

### BookingRefreshment
The result of running the rules, which the admin may then override.
| Field | Type | Notes |
|---|---|---|
| bookingId | string | |
| refreshmentItemId | string | |
| quantity | integer | |
| isAutoSuggested | boolean | distinguishes system suggestion from manual admin addition |
| note | string | e.g. "2 vegetarian" |

### Feedback
| Field | Type | Notes |
|---|---|---|
| id | string | |
| bookingId | string | |
| userId | string | |
| overallRating | integer | 1–5 |
| cleanlinessRating | integer | 1–5 |
| facilitiesRating | integer | 1–5 |
| refreshmentRating | integer | 1–5, optional |
| comment | string | free text |
| submittedAt | datetime | |

### FeedbackFacilityIssue
Lets a user report a specific broken item, which the admin can then act on by updating RoomFacility status. This closes the loop between feedback and room maintenance.
| Field | Type |
|---|---|
| feedbackId | string |
| facilityId | string |
| issueDescription | string |

### AuditLog
| Field | Type | Notes |
|---|---|---|
| id | string | |
| userId | string | who did it |
| action | string | e.g. "BOOKING_REASSIGNED" |
| entityType | string | "Booking" |
| entityId | string | |
| details | json | before/after values |
| createdAt | datetime | |

Every admin action writes an audit log row. Super admin can view this.

---

## 4. Business rules the system must enforce

1. **No double booking.** A room cannot have two APPROVED bookings whose times overlap. This must be checked on the server at the moment of approval, not only in the interface.
2. **Capacity check.** An admin cannot assign a room whose capacity is less than the booking's total attendees. If they attempt it, warn clearly and require explicit confirmation.
3. **Facility matching.** When an admin opens a pending request, the system suggests rooms that are free at that time, have sufficient capacity, and have the requested facilities marked AVAILABLE.
4. **No past bookings.** Requests cannot be made for a time that has already passed.
5. **End after start.** endTime must be later than startTime.
6. **Feedback gate.** Feedback is only possible on a booking with status COMPLETED, and only by someone linked to that booking.
7. **Refreshments recalculate.** If a booking's time, duration, or attendee mix changes, re-run the rules and flag to the admin that suggestions have changed.
8. **Reassignment safety.** Moving a booking to another room re-runs the conflict and capacity checks.

---

## 5. Screens to build

**Public**
- Login page

**Employee**
- Dashboard: my upcoming and past bookings
- New request form: title, purpose, date, start/end time, attendee counts by type, required facilities, preferred room (optional)
- Booking detail: status, assigned room, refreshments, admin notes
- Feedback form

**Local Admin**
- Pending request queue (the main working screen)
- Request review page: suggested rooms with capacity/facility match, approve/reject, refreshment list with editing
- Calendar view: all rooms, week view, colour-coded
- All bookings list with search and filter
- Feedback inbox

**Super Admin**
Everything above, plus a settings area:
- Rooms: list, add, edit, deactivate
- Room facilities: assign facilities to a room and set each status
- Facilities master list
- Attendee types
- Refreshment items
- **Refreshment rules** (add/edit/reorder/enable/disable)
- Users and roles
- Reports: room utilisation, feedback averages, refreshment volume
- Audit log

---

## 6. Day-by-day plan (10 working days)

| Day | Goal | Done when |
|---|---|---|
| **1** | Environment + project skeleton + database connected | The starter page opens in your browser and the database is reachable |
| **2** | Full database schema + seed data | 3 rooms, 8 facilities, 4 attendee types, 8 refreshment items, 7 rules, and 5 test users exist in the database |
| **3** | Login + the three roles | You can log in as each of the 3 test roles and are blocked from pages you shouldn't see |
| **4** | Employee request form + my bookings | You can submit a request and see it listed as PENDING |
| **5** | Local admin approval queue | An admin can see the request, get room suggestions, approve it, and double-booking is prevented |
| **6** | Refreshment rule engine | A 13:00–15:00 meeting with 2 foreign guests automatically produces lunch, water, and juice |
| **7** | Super admin settings panel | You can add a 4th room and a new refreshment rule entirely through the interface |
| **8** | Calendar, reschedule/transfer, feedback form | An admin can move a booking to another room; a completed booking can be rated |
| **9** | Testing and bug fixing — **no new features** | You have walked all three roles through the full journey twice with no errors |
| **10** | Deploy + demo preparation | Your supervisor can open a live link and use it |

**Protect Days 9 and 10.** The most common failure in a two-week project is adding features on Day 9 and demoing something broken on Day 10. If you are behind schedule, cut from the roadmap list, never from testing.

---

## 7. Future roadmap (deliberately excluded from v1)

Present these as planned next phases, not omissions:
- Email notifications on approval, rejection, and reminders
- Outlook / Google Calendar synchronisation
- Active Directory / single sign-on integration
- Recurring meetings
- QR code check-in to detect no-shows and auto-release rooms
- Refreshment cost reporting and budget tracking per department
- Bangla language interface
- Migration to BSRM internal server hosting

---

## 8. Technical decisions

- **Framework:** Next.js (App Router) with TypeScript
- **Database:** PostgreSQL, hosted on Neon during development and demo
- **ORM:** Prisma
- **Authentication:** Auth.js with credentials provider, session-based
- **Styling:** Tailwind CSS with shadcn/ui components
- **Hosting:** Vercel
- **Timezone:** Asia/Dhaka (UTC+6) — store all times in UTC, display in Dhaka time
- **Data policy:** demonstration data only; no real BSRM employee names, emails, or meeting content
