using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAlertLogFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "AlertLogs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsRead",
                table: "AlertLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "Pm25",
                table: "AlertLogs",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "SentToEmail",
                table: "AlertLogs",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SentToTelegramChatId",
                table: "AlertLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Success",
                table: "AlertLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Channel",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "IsRead",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "Pm25",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "SentToEmail",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "SentToTelegramChatId",
                table: "AlertLogs");

            migrationBuilder.DropColumn(
                name: "Success",
                table: "AlertLogs");
        }
    }
}
