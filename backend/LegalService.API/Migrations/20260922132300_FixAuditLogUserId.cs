using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class FixAuditLogUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "ServiceRequests"
                ALTER COLUMN "CustomerId" TYPE integer
                USING 0;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "AuditLogs"
                ALTER COLUMN "UserId" TYPE integer
                USING NULL;
                """);

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5326));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5331));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5332));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5295));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5300));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 13, 22, 59, 540, DateTimeKind.Utc).AddTicks(5301));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "ServiceRequests"
                ALTER COLUMN "CustomerId" TYPE uuid
                USING '00000000-0000-0000-0000-000000000000'::uuid;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "AuditLogs"
                ALTER COLUMN "UserId" TYPE uuid
                USING NULL;
                """);

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2151));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2155));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2157));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2045));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2052));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 22, 9, 33, 38, 895, DateTimeKind.Utc).AddTicks(2053));
        }
    }
}
