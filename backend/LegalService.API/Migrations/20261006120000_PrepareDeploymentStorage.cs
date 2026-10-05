using LegalService.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace LegalService.API.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261006120000_PrepareDeploymentStorage")]
public sealed class PrepareDeploymentStorage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<byte[]>(
            name: "FileContents", table: "DocumentFiles", type: "bytea", nullable: true);
        migrationBuilder.CreateTable(
            name: "AgentSessionStates",
            columns: table => new
            {
                Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                SessionId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                StateJson = table.Column<string>(type: "jsonb", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_AgentSessionStates", x => new { x.Kind, x.SessionId }));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AgentSessionStates");
        migrationBuilder.DropColumn(name: "FileContents", table: "DocumentFiles");
    }
}
