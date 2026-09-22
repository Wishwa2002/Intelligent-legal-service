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
            migrationBuilder.AlterColumn<int>(
                name: "CustomerId",
                table: "ServiceRequests",
                type: "integer",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "AuditLogs",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

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
            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "ServiceRequests",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "AuditLogs",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

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
