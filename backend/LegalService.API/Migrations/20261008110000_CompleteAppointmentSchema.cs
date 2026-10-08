using LegalService.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace LegalService.API.Migrations;

// Earlier migrations recorded these model fields in snapshots without adding
// them to a fresh database. Idempotence also supports databases repaired before
// this migration. No business rule or existing appointment value is changed.
[DbContext(typeof(ApplicationDbContext))]
[Migration("20261008110000_CompleteAppointmentSchema")]
public sealed class CompleteAppointmentSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        ALTER TABLE "Appointments" ADD COLUMN IF NOT EXISTS "ConsultationType" text NOT NULL DEFAULT 'Online';
        ALTER TABLE "Appointments" ADD COLUMN IF NOT EXISTS "Description" text NULL;
        ALTER TABLE "Appointments" ADD COLUMN IF NOT EXISTS "LegalServiceCategory" text NULL;
        """);
    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        ALTER TABLE "Appointments" DROP COLUMN IF EXISTS "LegalServiceCategory";
        ALTER TABLE "Appointments" DROP COLUMN IF EXISTS "Description";
        ALTER TABLE "Appointments" DROP COLUMN IF EXISTS "ConsultationType";
        """);
}
