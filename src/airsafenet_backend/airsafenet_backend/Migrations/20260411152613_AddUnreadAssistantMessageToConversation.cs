using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUnreadAssistantMessageToConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasUnreadAssistantMessage",
                table: "ChatConversations",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasUnreadAssistantMessage",
                table: "ChatConversations");
        }
    }
}
