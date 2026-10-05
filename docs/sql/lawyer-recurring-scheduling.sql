START TRANSACTION;

ALTER TABLE "Lawyers" ADD "DefaultAppointmentDurationMinutes" integer NOT NULL DEFAULT 30;

CREATE TABLE "LawyerUnavailabilities" (
    "Id" uuid NOT NULL,
    "LawyerId" uuid NOT NULL,
    "StartDateTime" timestamp without time zone NOT NULL,
    "EndDateTime" timestamp without time zone NOT NULL,
    "Reason" character varying(300) NOT NULL,
    "IsFullDay" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    CONSTRAINT "PK_LawyerUnavailabilities" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Unavailability_Time" CHECK ("StartDateTime" < "EndDateTime"),
    CONSTRAINT "FK_LawyerUnavailabilities_Lawyers_LawyerId" FOREIGN KEY ("LawyerId") REFERENCES "Lawyers" ("LawyerId") ON DELETE CASCADE
);

CREATE TABLE "LawyerWorkingSchedules" (
    "Id" uuid NOT NULL,
    "LawyerId" uuid NOT NULL,
    "DayOfWeek" integer NOT NULL,
    "StartTime" time without time zone NOT NULL,
    "EndTime" time without time zone NOT NULL,
    "IsWorkingDay" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    CONSTRAINT "PK_LawyerWorkingSchedules" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Schedule_Day" CHECK ("DayOfWeek" BETWEEN 0 AND 6),
    CONSTRAINT "CK_Schedule_Time" CHECK (NOT "IsWorkingDay" OR "StartTime" < "EndTime"),
    CONSTRAINT "FK_LawyerWorkingSchedules_Lawyers_LawyerId" FOREIGN KEY ("LawyerId") REFERENCES "Lawyers" ("LawyerId") ON DELETE CASCADE
);

ALTER TABLE "Lawyers" ADD CONSTRAINT "CK_Lawyer_Duration" CHECK ("DefaultAppointmentDurationMinutes" BETWEEN 15 AND 240);

CREATE INDEX "IX_Appointments_LawyerId_Status" ON "Appointments" ("LawyerId", "Status");

CREATE INDEX "IX_LawyerUnavailabilities_LawyerId_StartDateTime_EndDateTime" ON "LawyerUnavailabilities" ("LawyerId", "StartDateTime", "EndDateTime");

CREATE UNIQUE INDEX "IX_LawyerWorkingSchedules_LawyerId_DayOfWeek" ON "LawyerWorkingSchedules" ("LawyerId", "DayOfWeek");

INSERT INTO "LawyerWorkingSchedules" ("Id", "LawyerId", "DayOfWeek", "StartTime", "EndTime", "IsWorkingDay", "CreatedAt")
SELECT md5(l."LawyerId"::text || ':working:' || d.day)::uuid, l."LawyerId", d.day,
       CASE WHEN w.start_time < w.end_time THEN w.start_time ELSE TIME '09:00' END,
       CASE WHEN w.start_time < w.end_time THEN w.end_time ELSE TIME '17:00' END,
       COALESCE(w.start_time < w.end_time, false), NOW()
FROM "Lawyers" l CROSS JOIN generate_series(0, 6) AS d(day)
LEFT JOIN LATERAL (
    SELECT MAX(a."StartTime") AS start_time, MIN(a."EndTime") AS end_time
    FROM "LawyerAvailabilities" a
    WHERE a."LawyerId" = l."LawyerId" AND EXTRACT(DOW FROM a."Date")::integer = d.day
      AND a."StartTime" < a."EndTime"
) w ON true;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261004080145_AddRecurringLawyerScheduling', '8.0.29');

COMMIT;
