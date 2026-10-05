START TRANSACTION;

ALTER TABLE "LawyerRecommendationWorkflows" ADD "BookingDate" date;

ALTER TABLE "LawyerRecommendationWorkflows" ADD "ClientId" integer;

ALTER TABLE "LawyerRecommendationWorkflows" ADD "ReviewStage" character varying(20) NOT NULL DEFAULT 'MATCHES';

ALTER TABLE "LawyerRecommendationWorkflows" ADD "SelectedLawyerId" uuid;

ALTER TABLE "LawyerRecommendationWorkflows" ADD "SelectedSlotId" uuid;

ALTER TABLE "Appointments" ADD "AppointmentSource" text;

CREATE INDEX "IX_LawyerRecommendationWorkflows_ClientId" ON "LawyerRecommendationWorkflows" ("ClientId");

ALTER TABLE "LawyerRecommendationWorkflows" ADD CONSTRAINT "FK_LawyerRecommendationWorkflows_Users_ClientId" FOREIGN KEY ("ClientId") REFERENCES "Users" ("UserId") ON DELETE SET NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261004151111_AddFrontDeskMatchingIntake', '8.0.29');

COMMIT;
