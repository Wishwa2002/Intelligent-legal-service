using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkforceHiringIntelligence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PracticeAreaId",
                table: "Careers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HiringSuggestionWorkflows",
                columns: table => new
                {
                    WorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: false),
                    PracticeAreaId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SystemSnapshotJson = table.Column<string>(type: "jsonb", nullable: false),
                    AiDraftJson = table.Column<string>(type: "jsonb", nullable: false),
                    ReviewedDraftJson = table.Column<string>(type: "jsonb", nullable: false),
                    CareerOpeningId = table.Column<int>(type: "integer", nullable: true),
                    ApprovedTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HiringSuggestionWorkflows", x => x.WorkflowId);
                    table.ForeignKey(
                        name: "FK_HiringSuggestionWorkflows_Careers_CareerOpeningId",
                        column: x => x.CareerOpeningId,
                        principalTable: "Careers",
                        principalColumn: "CareerId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_HiringSuggestionWorkflows_Specializations_PracticeAreaId",
                        column: x => x.PracticeAreaId,
                        principalTable: "Specializations",
                        principalColumn: "SpecializationId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Careers_PracticeAreaId",
                table: "Careers",
                column: "PracticeAreaId",
                unique: true,
                filter: "\"PracticeAreaId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_HiringSuggestionWorkflows_CareerOpeningId",
                table: "HiringSuggestionWorkflows",
                column: "CareerOpeningId");

            migrationBuilder.CreateIndex(
                name: "IX_HiringSuggestionWorkflows_OwnerUserId_PracticeAreaId",
                table: "HiringSuggestionWorkflows",
                columns: new[] { "OwnerUserId", "PracticeAreaId" },
                unique: true,
                filter: "\"Status\" = 'AWAITING_APPROVAL' AND \"PracticeAreaId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_HiringSuggestionWorkflows_OwnerUserId_Status",
                table: "HiringSuggestionWorkflows",
                columns: new[] { "OwnerUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_HiringSuggestionWorkflows_PracticeAreaId",
                table: "HiringSuggestionWorkflows",
                column: "PracticeAreaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Careers_Specializations_PracticeAreaId",
                table: "Careers",
                column: "PracticeAreaId",
                principalTable: "Specializations",
                principalColumn: "SpecializationId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Careers_Specializations_PracticeAreaId",
                table: "Careers");

            migrationBuilder.DropTable(
                name: "HiringSuggestionWorkflows");

            migrationBuilder.DropIndex(
                name: "IX_Careers_PracticeAreaId",
                table: "Careers");

            migrationBuilder.DropColumn(
                name: "PracticeAreaId",
                table: "Careers");

        }
    }
}
