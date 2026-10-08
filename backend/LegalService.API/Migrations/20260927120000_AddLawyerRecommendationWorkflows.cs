using System;
using LegalService.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260927120000_AddLawyerRecommendationWorkflows")]
public sealed class AddLawyerRecommendationWorkflows : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "LawyerRecommendationWorkflows",
            columns: table => new
            {
                WorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                OwnerUserId = table.Column<int>(type: "integer", nullable: false),
                Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                UserRequirement = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                RequestedDate = table.Column<DateOnly>(type: "date", nullable: true),
                CategoryId = table.Column<int>(type: "integer", nullable: true),
                ParsedRequirementJson = table.Column<string>(type: "jsonb", nullable: false),
                RecommendationsJson = table.Column<string>(type: "jsonb", nullable: false),
                WarningsJson = table.Column<string>(type: "jsonb", nullable: false),
                AuditJson = table.Column<string>(type: "jsonb", nullable: false),
                ApprovedLawyerId = table.Column<Guid>(type: "uuid", nullable: true),
                AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_LawyerRecommendationWorkflows", x => x.WorkflowId));
        migrationBuilder.CreateIndex("IX_LawyerRecommendationWorkflows_OwnerUserId", "LawyerRecommendationWorkflows", "OwnerUserId");
        migrationBuilder.CreateIndex("IX_LawyerRecommendationWorkflows_Status", "LawyerRecommendationWorkflows", "Status");
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable(name: "LawyerRecommendationWorkflows");
}
