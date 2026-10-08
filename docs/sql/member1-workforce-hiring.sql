-- Additive Member 1 hiring migration only. Review the target schema before applying.
-- Does not apply unrelated pending migrations or change existing data.
START TRANSACTION;

ALTER TABLE "Careers" ADD "PracticeAreaId" integer;

CREATE TABLE "HiringSuggestionWorkflows" (
    "WorkflowId" uuid NOT NULL,
    "OwnerUserId" integer NOT NULL,
    "PracticeAreaId" integer,
    "Status" character varying(32) NOT NULL,
    "SystemSnapshotJson" jsonb NOT NULL,
    "AiDraftJson" jsonb NOT NULL,
    "ReviewedDraftJson" jsonb NOT NULL,
    "CareerOpeningId" integer,
    "ApprovedTitle" character varying(200),
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    "ApprovedAt" timestamp with time zone,
    "ApprovedBy" integer,
    CONSTRAINT "PK_HiringSuggestionWorkflows" PRIMARY KEY ("WorkflowId"),
    CONSTRAINT "FK_HiringSuggestionWorkflows_Careers_CareerOpeningId" FOREIGN KEY ("CareerOpeningId") REFERENCES "Careers" ("CareerId") ON DELETE SET NULL,
    CONSTRAINT "FK_HiringSuggestionWorkflows_Specializations_PracticeAreaId" FOREIGN KEY ("PracticeAreaId") REFERENCES "Specializations" ("SpecializationId") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "IX_Careers_PracticeAreaId" ON "Careers" ("PracticeAreaId") WHERE "PracticeAreaId" IS NOT NULL;

CREATE INDEX "IX_HiringSuggestionWorkflows_CareerOpeningId" ON "HiringSuggestionWorkflows" ("CareerOpeningId");

CREATE UNIQUE INDEX "IX_HiringSuggestionWorkflows_OwnerUserId_PracticeAreaId" ON "HiringSuggestionWorkflows" ("OwnerUserId", "PracticeAreaId") WHERE "Status" = 'AWAITING_APPROVAL' AND "PracticeAreaId" IS NOT NULL;

CREATE INDEX "IX_HiringSuggestionWorkflows_OwnerUserId_Status" ON "HiringSuggestionWorkflows" ("OwnerUserId", "Status");

CREATE INDEX "IX_HiringSuggestionWorkflows_PracticeAreaId" ON "HiringSuggestionWorkflows" ("PracticeAreaId");

ALTER TABLE "Careers" ADD CONSTRAINT "FK_Careers_Specializations_PracticeAreaId" FOREIGN KEY ("PracticeAreaId") REFERENCES "Specializations" ("SpecializationId") ON DELETE SET NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261003233848_AddWorkforceHiringIntelligence', '8.0.29');

COMMIT;
