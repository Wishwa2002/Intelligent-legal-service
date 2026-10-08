using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLegalDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LegalDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PublishedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OfficialUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FullText = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    SourceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExternalId = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LegalDocuments", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8037));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8040));

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8041));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8001));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8006));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 10, 4, 8, 51, 57, 460, DateTimeKind.Utc).AddTicks(8007));

            migrationBuilder.CreateIndex(
                name: "IX_LegalDocuments_ExternalId",
                table: "LegalDocuments",
                column: "ExternalId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LegalDocuments");

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
        }
    }
}
