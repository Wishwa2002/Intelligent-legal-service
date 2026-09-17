using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentFileMetadataAndServiceFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "DocumentFiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DocumentStatus",
                table: "DocumentFiles",
                type: "text",
                nullable: false,
                defaultValue: "Received");

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "DocumentFiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "DocumentFiles",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "DocumentationServices",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiredDocuments",
                table: "DocumentationServices",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 1,
                columns: new[] { "IsActive", "RequiredDocuments" },
                values: new object[] { true, "[\"Original Contract\",\"Amendment Request Letter\",\"NIC Copy\"]" });

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 2,
                columns: new[] { "IsActive", "RequiredDocuments" },
                values: new object[] { true, "[\"NIC\",\"Completed Affidavit Draft\",\"Witness Details\"]" });

            migrationBuilder.UpdateData(
                table: "DocumentationServices",
                keyColumn: "ServiceId",
                keyValue: 3,
                columns: new[] { "IsActive", "RequiredDocuments" },
                values: new object[] { true, "[\"NIC of Grantor\",\"NIC of Grantee\",\"Scope of Authority Document\"]" });

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 2, 12, 0, 30, 347, DateTimeKind.Utc).AddTicks(4129));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 2, 12, 0, 30, 347, DateTimeKind.Utc).AddTicks(4142));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 9, 2, 12, 0, 30, 347, DateTimeKind.Utc).AddTicks(4144));

            migrationBuilder.CreateIndex(
                name: "IX_DocumentFiles_DocumentStatus",
                table: "DocumentFiles",
                column: "DocumentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentationServices_IsActive",
                table: "DocumentationServices",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DocumentFiles_DocumentStatus",
                table: "DocumentFiles");

            migrationBuilder.DropIndex(
                name: "IX_DocumentationServices_IsActive",
                table: "DocumentationServices");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "DocumentFiles");

            migrationBuilder.DropColumn(
                name: "DocumentStatus",
                table: "DocumentFiles");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "DocumentFiles");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "DocumentFiles");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "DocumentationServices");

            migrationBuilder.DropColumn(
                name: "RequiredDocuments",
                table: "DocumentationServices");

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 9, 37, 50, 386, DateTimeKind.Utc).AddTicks(1144));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 9, 37, 50, 386, DateTimeKind.Utc).AddTicks(1153));

            migrationBuilder.UpdateData(
                table: "LegalServices",
                keyColumn: "LegalServiceId",
                keyValue: 3,
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 9, 37, 50, 386, DateTimeKind.Utc).AddTicks(1155));
        }
    }
}
