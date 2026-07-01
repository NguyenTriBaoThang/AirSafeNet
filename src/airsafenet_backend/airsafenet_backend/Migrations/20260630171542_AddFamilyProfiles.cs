using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFamilyProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FamilyProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Relationship = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UserGroup = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PreferredLocation = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    NotifyEnabled = table.Column<bool>(type: "bit", nullable: false),
                    NotifyThreshold = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FamilyProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FamilyProfiles_UserId_DisplayName",
                table: "FamilyProfiles",
                columns: new[] { "UserId", "DisplayName" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FamilyProfiles");
        }
    }
}
