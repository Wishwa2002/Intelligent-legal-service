using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerServiceRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create ServiceRequests table if it doesn't exist
            // This handles the case where the table wasn't created by prior migrations
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ServiceRequests"" (
                    ""ServiceRequestId"" uuid NOT NULL DEFAULT gen_random_uuid(),
                    ""CustomerId"" uuid NOT NULL,
                    ""Title"" character varying(200) NOT NULL DEFAULT '',
                    ""Description"" character varying(2000) NOT NULL DEFAULT '',
                    ""Status"" character varying(30) NOT NULL DEFAULT 'Submitted',
                    ""RequestType"" character varying(100) NOT NULL DEFAULT '',
                    ""Priority"" character varying(20) NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    CONSTRAINT ""PK_ServiceRequests"" PRIMARY KEY (""ServiceRequestId"")
                );
            ");

            // Add RequestType column if not already present (idempotent)
            migrationBuilder.Sql(@"
                ALTER TABLE ""ServiceRequests""
                    ADD COLUMN IF NOT EXISTS ""RequestType"" character varying(100) NOT NULL DEFAULT '';
            ");

            // Add Priority column if not already present (idempotent)
            migrationBuilder.Sql(@"
                ALTER TABLE ""ServiceRequests""
                    ADD COLUMN IF NOT EXISTS ""Priority"" character varying(20) NULL;
            ");

            // Constrain Status to varchar(30) if it's currently text
            migrationBuilder.Sql(@"
                ALTER TABLE ""ServiceRequests""
                    ALTER COLUMN ""Status"" TYPE character varying(30);
            ");

            // Constrain Title to varchar(200) if it's currently text
            migrationBuilder.Sql(@"
                ALTER TABLE ""ServiceRequests""
                    ALTER COLUMN ""Title"" TYPE character varying(200);
            ");

            // Constrain Description to varchar(2000) if it's currently text
            migrationBuilder.Sql(@"
                ALTER TABLE ""ServiceRequests""
                    ALTER COLUMN ""Description"" TYPE character varying(2000);
            ");

            // Set UpdatedAt NOT NULL (fill any NULLs first)
            migrationBuilder.Sql(@"
                UPDATE ""ServiceRequests"" SET ""UpdatedAt"" = ""CreatedAt"" WHERE ""UpdatedAt"" IS NULL;
                ALTER TABLE ""ServiceRequests"" ALTER COLUMN ""UpdatedAt"" SET NOT NULL;
            ");

            // Create indexes (IF NOT EXISTS guards)
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_ServiceRequests_Status""
                    ON ""ServiceRequests"" (""Status"");
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_ServiceRequests_RequestType""
                    ON ""ServiceRequests"" (""RequestType"");
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_ServiceRequests_CreatedAt""
                    ON ""ServiceRequests"" (""CreatedAt"");
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_ServiceRequests_CustomerId""
                    ON ""ServiceRequests"" (""CustomerId"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_ServiceRequests_Status"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_ServiceRequests_RequestType"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_ServiceRequests_CreatedAt"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_ServiceRequests_CustomerId"";");
            migrationBuilder.Sql(@"ALTER TABLE ""ServiceRequests"" DROP COLUMN IF EXISTS ""RequestType"";");
            migrationBuilder.Sql(@"ALTER TABLE ""ServiceRequests"" DROP COLUMN IF EXISTS ""Priority"";");
        }
    }
}
