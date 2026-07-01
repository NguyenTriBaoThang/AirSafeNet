using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAlertInboxFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlertReason",
                table: "AlertLogs",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadAt",
                table: "AlertLogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecommendedAction",
                table: "AlertLogs",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlertReason",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "ReadAt",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "RecommendedAction",
                table: "AlertLogs");
        }
    }
}
