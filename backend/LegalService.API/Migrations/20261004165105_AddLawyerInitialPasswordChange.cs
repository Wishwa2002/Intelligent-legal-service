using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace LegalService.API.Migrations;
public partial class AddLawyerInitialPasswordChange : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(name: "MustChangePassword", table: "Users", type: "boolean", nullable: false, defaultValue: false);
        // Existing lawyer identities may still use a shared/admin-assigned initial password.
        migrationBuilder.Sql("UPDATE \"Users\" SET \"MustChangePassword\" = TRUE WHERE \"Role\" = 'Lawyer';");
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "MustChangePassword", table: "Users");
    }
}
