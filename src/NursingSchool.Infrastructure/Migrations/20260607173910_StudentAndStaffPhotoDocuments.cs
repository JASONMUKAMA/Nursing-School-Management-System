using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NursingSchool.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StudentAndStaffPhotoDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NationalIdDocumentUrl",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NationalIdUrl",
                table: "Students",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoUrl",
                table: "Students",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NationalIdDocumentUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NationalIdUrl",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoUrl",
                table: "Students");
        }
    }
}
