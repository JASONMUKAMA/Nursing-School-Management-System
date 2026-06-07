using NursingSchool.Application.Helpers;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.UnitTests;

public class InvoiceCalculatorTests
{
    [Fact]
    public void GetBalance_SubtractsPayments()
    {
        var invoice = new Invoice { TotalAmount = 1000, Payments = [new Payment { Amount = 400 }] };
        Assert.Equal(600, InvoiceCalculator.GetBalance(invoice));
    }

    [Fact]
    public void GetStatus_PaidWhenBalanceZero()
    {
        var invoice = new Invoice
        {
            TotalAmount = 500,
            Payments = [new Payment { Amount = 500 }]
        };
        Assert.Equal(InvoiceStatuses.Paid, InvoiceCalculator.GetStatus(invoice));
    }

    [Fact]
    public void GetStatus_UnpaidWhenNoPayments()
    {
        var invoice = new Invoice { TotalAmount = 500, Payments = [] };
        Assert.Equal(InvoiceStatuses.Unpaid, InvoiceCalculator.GetStatus(invoice));
    }
}
