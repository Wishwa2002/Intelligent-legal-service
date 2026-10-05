using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkforcePlanningSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PracticeAreaWorkforceSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PracticeAreaId = table.Column<int>(type: "integer", nullable: false),
                    MinimumActiveLawyers = table.Column<int>(type: "integer", nullable: false),
                    TargetActiveLawyers = table.Column<int>(type: "integer", nullable: false),
                    MinimumFutureSlots = table.Column<int>(type: "integer", nullable: false),
                    HighDemandThreshold = table.Column<int>(type: "integer", nullable: false),
                    WatchCapacityRatio = table.Column<double>(type: "double precision", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeAreaWorkforceSettings", x => x.Id);
                    table.CheckConstraint("CK_WorkforceSettings_Ranges", "\"MinimumActiveLawyers\" BETWEEN 0 AND 100 AND \"TargetActiveLawyers\" BETWEEN \"MinimumActiveLawyers\" AND 200 AND \"MinimumFutureSlots\" BETWEEN 0 AND 1000 AND \"HighDemandThreshold\" BETWEEN 0 AND 10000 AND \"WatchCapacityRatio\" > 0 AND \"WatchCapacityRatio\" <= 1");
                    table.ForeignKey(
                        name: "FK_PracticeAreaWorkforceSettings_Specializations_PracticeAreaId",
                        column: x => x.PracticeAreaId,
                        principalTable: "Specializations",
                        principalColumn: "SpecializationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkforceDemoStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    ArtifactsJson = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkforceDemoStates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAreaWorkforceSettings_PracticeAreaId",
                table: "PracticeAreaWorkforceSettings",
                column: "PracticeAreaId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PracticeAreaWorkforceSettings");

            migrationBuilder.DropTable(
                name: "WorkforceDemoStates");

        }
    }
}
