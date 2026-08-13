-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'LOCAL_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RoomFacilityStatus" AS ENUM ('AVAILABLE', 'NOT_AVAILABLE', 'OUT_OF_ORDER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RefreshmentCategory" AS ENUM ('BEVERAGE', 'SNACK', 'MEAL');

-- CreateEnum
CREATE TYPE "RefreshmentTriggerMode" AS ENUM ('MEETING_OVERLAPS_WINDOW', 'MEETING_STARTS_IN_WINDOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFacility" (
    "roomId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "status" "RoomFacilityStatus" NOT NULL,
    "note" TEXT,

    CONSTRAINT "RoomFacility_pkey" PRIMARY KEY ("roomId","facilityId")
);

-- CreateTable
CREATE TABLE "AttendeeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AttendeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "totalAttendees" INTEGER NOT NULL,
    "preferredRoomId" TEXT,
    "assignedRoomId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAttendeeGroup" (
    "bookingId" TEXT NOT NULL,
    "attendeeTypeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "BookingAttendeeGroup_pkey" PRIMARY KEY ("bookingId","attendeeTypeId")
);

-- CreateTable
CREATE TABLE "RefreshmentItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RefreshmentCategory" NOT NULL,
    "estimatedCostPerHead" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RefreshmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshmentRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesFromTime" TIME NOT NULL,
    "appliesToTime" TIME NOT NULL,
    "triggerMode" "RefreshmentTriggerMode" NOT NULL,
    "minDurationMinutes" INTEGER NOT NULL,
    "attendeeTypeId" TEXT,
    "refreshmentItemId" TEXT NOT NULL,
    "qtyPerHead" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RefreshmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRefreshment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "refreshmentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isAutoSuggested" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "BookingRefreshment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER NOT NULL,
    "facilitiesRating" INTEGER NOT NULL,
    "refreshmentRating" INTEGER,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackFacilityIssue" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,

    CONSTRAINT "FeedbackFacilityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RequestedFacilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RequestedFacilities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_name_key" ON "Facility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeType_name_key" ON "AttendeeType"("name");

-- CreateIndex
CREATE INDEX "Booking_assignedRoomId_startTime_endTime_idx" ON "Booking"("assignedRoomId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshmentItem_name_key" ON "RefreshmentItem"("name");

-- CreateIndex
CREATE INDEX "Feedback_bookingId_idx" ON "Feedback"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_bookingId_userId_key" ON "Feedback"("bookingId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "_RequestedFacilities_B_index" ON "_RequestedFacilities"("B");

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_preferredRoomId_fkey" FOREIGN KEY ("preferredRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedRoomId_fkey" FOREIGN KEY ("assignedRoomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttendeeGroup" ADD CONSTRAINT "BookingAttendeeGroup_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAttendeeGroup" ADD CONSTRAINT "BookingAttendeeGroup_attendeeTypeId_fkey" FOREIGN KEY ("attendeeTypeId") REFERENCES "AttendeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshmentRule" ADD CONSTRAINT "RefreshmentRule_attendeeTypeId_fkey" FOREIGN KEY ("attendeeTypeId") REFERENCES "AttendeeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshmentRule" ADD CONSTRAINT "RefreshmentRule_refreshmentItemId_fkey" FOREIGN KEY ("refreshmentItemId") REFERENCES "RefreshmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRefreshment" ADD CONSTRAINT "BookingRefreshment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRefreshment" ADD CONSTRAINT "BookingRefreshment_refreshmentItemId_fkey" FOREIGN KEY ("refreshmentItemId") REFERENCES "RefreshmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFacilityIssue" ADD CONSTRAINT "FeedbackFacilityIssue_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFacilityIssue" ADD CONSTRAINT "FeedbackFacilityIssue_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestedFacilities" ADD CONSTRAINT "_RequestedFacilities_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestedFacilities" ADD CONSTRAINT "_RequestedFacilities_B_fkey" FOREIGN KEY ("B") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
