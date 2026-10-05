using LegalService.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace LegalService.API.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261003090000_FixLegacyUserRoleIds")]
public class FixLegacyUserRoleIds : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // The placeholder schema-sync migration left the original UUID column behind.
        // Refuse conversion when legacy associations exist and require explicit mapping.
        migrationBuilder.Sql("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema() AND table_name = 'UserRoles'
                        AND column_name = 'UserId' AND data_type = 'uuid'
                ) THEN
                    IF EXISTS (SELECT 1 FROM "UserRoles") THEN
                        RAISE EXCEPTION 'Legacy user-role associations require an explicit UUID-to-integer mapping.';
                    END IF;
                    ALTER TABLE "UserRoles" ALTER COLUMN "UserId" TYPE integer
                        USING "UserId"::text::integer;
                END IF;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM "UserRoles") THEN
                    RAISE EXCEPTION 'Cannot restore UUID IDs while integer user-role associations exist.';
                END IF;
                ALTER TABLE "UserRoles" ALTER COLUMN "UserId" TYPE uuid
                    USING "UserId"::text::uuid;
            END $$;
            """);
    }
}
