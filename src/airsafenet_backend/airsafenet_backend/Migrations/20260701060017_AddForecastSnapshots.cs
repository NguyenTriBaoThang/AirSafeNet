using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace airsafenet_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddForecastSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ForecastSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserGroup = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TargetTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PredictedPm25 = table.Column<double>(type: "float", nullable: false),
                    PredictedAqi = table.Column<int>(type: "int", nullable: false),
                    Risk = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Recommendation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ForecastHorizonHours = table.Column<int>(type: "int", nullable: false),
                    SnapshotCreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ForecastSnapshots", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ForecastSnapshots_UserGroup_IssuedAt_TargetTime",
                table: "ForecastSnapshots",
                columns: new[] { "UserGroup", "IssuedAt", "TargetTime" });

            migrationBuilder.CreateIndex(
                name: "IX_ForecastSnapshots_UserGroup_TargetTime",
                table: "ForecastSnapshots",
                columns: new[] { "UserGroup", "TargetTime" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ForecastSnapshots");
        }
    }
}
