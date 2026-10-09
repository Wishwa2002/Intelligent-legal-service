using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFrontDeskMatchingIntake : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "BookingDate",
                table: "LawyerRecommendationWorkflows",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientId",
                table: "LawyerRecommendationWorkflows",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewStage",
                table: "LawyerRecommendationWorkflows",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "MATCHES");

            migrationBuilder.AddColumn<Guid>(
                name: "SelectedLawyerId",
                table: "LawyerRecommendationWorkflows",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SelectedSlotId",
                table: "LawyerRecommendationWorkflows",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AppointmentSource",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LawyerRecommendationWorkflows_ClientId",
                table: "LawyerRecommendationWorkflows",
                column: "ClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_LawyerRecommendationWorkflows_Users_ClientId",
                table: "LawyerRecommendationWorkflows",
                column: "ClientId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LawyerRecommendationWorkflows_Users_ClientId",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropIndex(
                name: "IX_LawyerRecommendationWorkflows_ClientId",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "BookingDate",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "ReviewStage",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "SelectedLawyerId",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "SelectedSlotId",
                table: "LawyerRecommendationWorkflows");

            migrationBuilder.DropColumn(
                name: "AppointmentSource",
                table: "Appointments");

        }
    }
}
