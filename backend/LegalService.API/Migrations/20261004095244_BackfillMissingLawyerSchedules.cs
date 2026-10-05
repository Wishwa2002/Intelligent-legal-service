using LegalService.API.Data;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace LegalService.API.Migrations;

public partial class BackfillMissingLawyerSchedules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(LawyerScheduleBackfill.LockSql);
        migrationBuilder.Sql(LawyerScheduleBackfill.DurationSql);
        migrationBuilder.Sql(LawyerScheduleBackfill.ScheduleSql);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Defaults may have been edited or used by appointments; never delete them on rollback.
    }
}
