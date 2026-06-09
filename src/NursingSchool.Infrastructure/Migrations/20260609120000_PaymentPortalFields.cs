using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NursingSchool.Infrastructure.Migrations
{
    public partial class PaymentPortalFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CardLastFour",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayerPhone",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionReference",
                table: "Payments",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CardLastFour", table: "Payments");
            migrationBuilder.DropColumn(name: "PayerPhone", table: "Payments");
            migrationBuilder.DropColumn(name: "TransactionReference", table: "Payments");
        }
    }
}
