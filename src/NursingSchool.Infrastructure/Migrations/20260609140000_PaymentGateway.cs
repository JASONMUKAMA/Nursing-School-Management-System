using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NursingSchool.Infrastructure.Migrations
{
    public partial class PaymentGateway : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankReceiptNo",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalTransactionId",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GatewayTransactionId",
                table: "Payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentSource",
                table: "Payments",
                type: "text",
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.AddColumn<string>(
                name: "ProviderReference",
                table: "Payments",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PaymentGatewayTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    ExternalTransactionId = table.Column<string>(type: "text", nullable: false),
                    ProviderReference = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    FailureReason = table.Column<string>(type: "text", nullable: true),
                    RawResponse = table.Column<string>(type: "text", nullable: true),
                    CallbackReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsReconciled = table.Column<bool>(type: "boolean", nullable: false),
                    InitiatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentGatewayTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentGatewayTransactions_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PaymentGatewayTransactions_Payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "Payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PaymentGatewayTransactions_Users_InitiatedBy",
                        column: x => x.InitiatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentGatewayTransactions_ExternalTransactionId",
                table: "PaymentGatewayTransactions",
                column: "ExternalTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentGatewayTransactions_InvoiceId",
                table: "PaymentGatewayTransactions",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentGatewayTransactions_InitiatedBy",
                table: "PaymentGatewayTransactions",
                column: "InitiatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentGatewayTransactions_PaymentId",
                table: "PaymentGatewayTransactions",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_GatewayTransactionId",
                table: "Payments",
                column: "GatewayTransactionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_PaymentGatewayTransactions_GatewayTransactionId",
                table: "Payments",
                column: "GatewayTransactionId",
                principalTable: "PaymentGatewayTransactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_PaymentGatewayTransactions_GatewayTransactionId",
                table: "Payments");

            migrationBuilder.DropTable(name: "PaymentGatewayTransactions");

            migrationBuilder.DropIndex(name: "IX_Payments_GatewayTransactionId", table: "Payments");

            migrationBuilder.DropColumn(name: "BankReceiptNo", table: "Payments");
            migrationBuilder.DropColumn(name: "ExternalTransactionId", table: "Payments");
            migrationBuilder.DropColumn(name: "GatewayTransactionId", table: "Payments");
            migrationBuilder.DropColumn(name: "PaymentSource", table: "Payments");
            migrationBuilder.DropColumn(name: "ProviderReference", table: "Payments");
        }
    }
}
