START TRANSACTION;

DO $$ BEGIN
  PERFORM "LawyerId" FROM "Lawyers" ORDER BY "LawyerId" FOR UPDATE;
END $$;

UPDATE "Lawyers" SET "DefaultAppointmentDurationMinutes" = 30
WHERE "DefaultAppointmentDurationMinutes" IS NULL OR "DefaultAppointmentDurationMinutes" = 0;

INSERT INTO "LawyerWorkingSchedules"
  ("Id", "LawyerId", "DayOfWeek", "StartTime", "EndTime", "IsWorkingDay", "CreatedAt")
SELECT md5(l."LawyerId"::text || ':default-weekly:' || d.day)::uuid,
  l."LawyerId", d.day, TIME '09:00', TIME '17:00', d.day BETWEEN 1 AND 5, NOW()
FROM "Lawyers" l CROSS JOIN generate_series(0, 6) AS d(day)
WHERE NOT EXISTS (SELECT 1 FROM "LawyerWorkingSchedules" s WHERE s."LawyerId" = l."LawyerId")
ON CONFLICT ("LawyerId", "DayOfWeek") DO NOTHING;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261004095244_BackfillMissingLawyerSchedules', '8.0.29');

COMMIT;
