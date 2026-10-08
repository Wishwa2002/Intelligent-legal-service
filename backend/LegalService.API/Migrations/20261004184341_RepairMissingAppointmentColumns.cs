using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class RepairMissingAppointmentColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                ADD COLUMN IF NOT EXISTS "ConsultationType" text;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                ADD COLUMN IF NOT EXISTS "Description" text;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                ADD COLUMN IF NOT EXISTS "LegalServiceCategory" text;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                DROP COLUMN IF EXISTS "ConsultationType";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                DROP COLUMN IF EXISTS "Description";
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Appointments"
                DROP COLUMN IF EXISTS "LegalServiceCategory";
            """);
        }
    }
}