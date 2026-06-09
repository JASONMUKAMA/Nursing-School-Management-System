export const PAYMENT_METHOD_AIRTEL = 'Airtel Money';
export const PAYMENT_METHOD_MTN = 'MTN Mobile Money';
export const PAYMENT_METHOD_VISA = 'Visa Card';
export const PAYMENT_METHOD_BANK = 'Bank Transfer';

export type PaymentMethodChoice = 'visa' | 'mtn' | 'airtel' | 'bank';

export const PAYMENT_METHOD_OPTIONS: {
  id: PaymentMethodChoice;
  apiValue: string;
  name: string;
  desc: string;
}[] = [
  { id: 'visa', apiValue: PAYMENT_METHOD_VISA, name: 'Visa', desc: 'Debit / credit card' },
  { id: 'mtn', apiValue: PAYMENT_METHOD_MTN, name: 'MTN Mobile Money', desc: 'Mobile money — Uganda' },
  { id: 'airtel', apiValue: PAYMENT_METHOD_AIRTEL, name: 'Airtel Money', desc: 'Mobile money — Uganda' },
  { id: 'bank', apiValue: PAYMENT_METHOD_BANK, name: 'Bank transfer', desc: 'Deposit or EFT receipt' },
];

export function apiValueForMethod(method: PaymentMethodChoice): string {
  return PAYMENT_METHOD_OPTIONS.find((o) => o.id === method)?.apiValue ?? PAYMENT_METHOD_AIRTEL;
}
