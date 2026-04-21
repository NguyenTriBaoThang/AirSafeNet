using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastAlertSentAt",
                table: "UserPreferences",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotifyChannel",
                table: "UserPreferences",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NotifyEmail",
                table: "UserPreferences",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NotifyThreshold",
                table: "UserPreferences",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TelegramChatId",
                table: "UserPreferences",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastAlertSentAt",
                table: "UserPreferences");

            migrationBuilder.DropColumn(
                name: "NotifyChannel",
                table: "UserPreferences");

            migrationBuilder.DropColumn(
                name: "NotifyEmail",
                table: "UserPreferences");

            migrationBuilder.DropColumn(
                name: "NotifyThreshold",
                table: "UserPreferences");

            migrationBuilder.DropColumn(
                name: "TelegramChatId",
                table: "UserPreferences");
        }
    }
}
