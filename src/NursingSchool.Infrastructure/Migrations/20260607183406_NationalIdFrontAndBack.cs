using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NursingSchool.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NationalIdFrontAndBack : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "NationalIdDocumentUrl",
                table: "Users",
                newName: "NationalIdFrontUrl");

            migrationBuilder.RenameColumn(
                name: "NationalIdUrl",
                table: "Students",
                newName: "NationalIdFrontUrl");

            migrationBuilder.AddColumn<string>(
                name: "NationalIdBackUrl",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NationalIdBackUrl",
                table: "Students",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NationalIdBackUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NationalIdBackUrl",
                table: "Students");

            migrationBuilder.RenameColumn(
                name: "NationalIdFrontUrl",
                table: "Users",
                newName: "NationalIdDocumentUrl");

            migrationBuilder.RenameColumn(
                name: "NationalIdFrontUrl",
                table: "Students",
                newName: "NationalIdUrl");
        }
    }
}
