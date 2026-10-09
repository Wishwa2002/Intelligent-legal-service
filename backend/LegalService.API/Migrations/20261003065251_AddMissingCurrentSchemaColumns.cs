using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingCurrentSchemaColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Clerks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Lawyers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Lawyers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Lawyers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7280));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7290));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7290));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7270));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7270));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 3, 6, 52, 51, 213, DateTimeKind.Utc).AddTicks(7270));

            migrationBuilder.CreateIndex(
                name: "IX_Clerks_UserId",
                table: "Clerks",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Clerks_Users_UserId",
                table: "Clerks",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clerks_Users_UserId",
                table: "Clerks");

            migrationBuilder.DropIndex(
                name: "IX_Clerks_UserId",
                table: "Clerks");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Clerks");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Lawyers");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Lawyers");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Lawyers");

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5724));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5727));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5729));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5691));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5695));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 5, 15, 36, 175, DateTimeKind.Utc).AddTicks(5697));
        }
    }
}
