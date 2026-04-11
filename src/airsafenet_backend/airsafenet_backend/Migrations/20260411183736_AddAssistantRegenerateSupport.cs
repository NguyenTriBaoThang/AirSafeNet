using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssistantRegenerateSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RegeneratedCount",
                table: "ChatMessages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SourceUserMessageId",
                table: "ChatMessages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ChatMessages",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RegeneratedCount",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "SourceUserMessageId",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ChatMessages");
        }
    }
}
