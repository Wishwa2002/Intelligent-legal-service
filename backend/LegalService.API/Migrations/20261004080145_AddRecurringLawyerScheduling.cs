using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringLawyerScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultAppointmentDurationMinutes",
                table: "Lawyers",
                type: "integer",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.CreateTable(
                name: "LawyerUnavailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LawyerId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDateTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDateTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    IsFullDay = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LawyerUnavailabilities", x => x.Id);
                    table.CheckConstraint("CK_Unavailability_Time", "\"StartDateTime\" < \"EndDateTime\"");
                    table.ForeignKey(
                        name: "FK_LawyerUnavailabilities_Lawyers_LawyerId",
                        column: x => x.LawyerId,
                        principalTable: "Lawyers",
                        principalColumn: "LawyerId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LawyerWorkingSchedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LawyerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsWorkingDay = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LawyerWorkingSchedules", x => x.Id);
                    table.CheckConstraint("CK_Schedule_Day", "\"DayOfWeek\" BETWEEN 0 AND 6");
                    table.CheckConstraint("CK_Schedule_Time", "NOT \"IsWorkingDay\" OR \"StartTime\" < \"EndTime\"");
                    table.ForeignKey(
                        name: "FK_LawyerWorkingSchedules_Lawyers_LawyerId",
                        column: x => x.LawyerId,
                        principalTable: "Lawyers",
                        principalColumn: "LawyerId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Lawyer_Duration",
                table: "Lawyers",
                sql: "\"DefaultAppointmentDurationMinutes\" BETWEEN 15 AND 240");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_LawyerId_Status",
                table: "Appointments",
                columns: new[] { "LawyerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LawyerUnavailabilities_LawyerId_StartDateTime_EndDateTime",
                table: "LawyerUnavailabilities",
                columns: new[] { "LawyerId", "StartDateTime", "EndDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_LawyerWorkingSchedules_LawyerId_DayOfWeek",
                table: "LawyerWorkingSchedules",
                columns: new[] { "LawyerId", "DayOfWeek" },
                unique: true);
            // Preserve all legacy records. Infer only the common weekly working interval.
            migrationBuilder.Sql("""
                INSERT INTO "LawyerWorkingSchedules" ("Id", "LawyerId", "DayOfWeek", "StartTime", "EndTime", "IsWorkingDay", "CreatedAt")
                SELECT md5(l."LawyerId"::text || ':working:' || d.day)::uuid, l."LawyerId", d.day,
                       CASE WHEN w.start_time < w.end_time THEN w.start_time ELSE TIME '09:00' END,
                       CASE WHEN w.start_time < w.end_time THEN w.end_time ELSE TIME '17:00' END,
                       COALESCE(w.start_time < w.end_time, false), NOW()
                FROM "Lawyers" l CROSS JOIN generate_series(0, 6) AS d(day)
                LEFT JOIN LATERAL (
                    SELECT MAX(a."StartTime") AS start_time, MIN(a."EndTime") AS end_time
                    FROM "LawyerAvailabilities" a
                    WHERE a."LawyerId" = l."LawyerId" AND EXTRACT(DOW FROM a."Date")::integer = d.day
                      AND a."StartTime" < a."EndTime"
                ) w ON true;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LawyerUnavailabilities");

            migrationBuilder.DropTable(
                name: "LawyerWorkingSchedules");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Lawyer_Duration",
                table: "Lawyers");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_LawyerId_Status",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "DefaultAppointmentDurationMinutes",
                table: "Lawyers");

}
    }
}
