import type { ReactNode } from 'react';
import {
  PAYMENT_METHOD_AIRTEL,
  PAYMENT_METHOD_BANK,
  PAYMENT_METHOD_MTN,
  PAYMENT_METHOD_VISA,
} from './paymentMethods';

interface LogoProps {
  className?: string;
  title?: string;
}

export function AirtelMoneyLogo({ className = '', title = 'Airtel Money' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <rect width="120" height="40" rx="6" fill="#ED1C24" />
      <circle cx="14" cy="20" r="8" fill="#fff" />
      <path d="M14 14.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z" fill="#ED1C24" />
      <text x="28" y="18" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700">
        airtel
      </text>
      <text x="28" y="30" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="8" fontWeight="600" letterSpacing="1.2">
        MONEY
      </text>
    </svg>
  );
}

export function MtnMobileMoneyLogo({ className = '', title = 'MTN Mobile Money' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <rect width="120" height="40" rx="6" fill="#FFCC00" />
      <text x="10" y="18" fill="#000" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="800">
        MTN
      </text>
      <text x="10" y="30" fill="#E30613" fontFamily="Arial, Helvetica, sans-serif" fontSize="7.5" fontWeight="700">
        Mobile Money
      </text>
      <rect x="72" y="8" width="18" height="24" rx="2" fill="#1a1a1a" />
      <rect x="74" y="10" width="14" height="10" rx="1" fill="#4a9fd4" />
      <rect x="76" y="22" width="10" height="2" rx="1" fill="#666" />
      <rect x="76" y="26" width="10" height="2" rx="1" fill="#666" />
      <rect x="94" y="26" width="8" height="5" rx="1" fill="#43a047" opacity="0.85" />
    </svg>
  );
}

export function VisaLogo({ className = '', title = 'Visa' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <rect width="120" height="40" rx="6" fill="#1A1F71" />
      <text
        x="60"
        y="27"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="22"
        fontWeight="700"
        fontStyle="italic"
      >
        VISA
      </text>
    </svg>
  );
}

export function PaymentMethodLogo({
  method,
  className = '',
}: {
  method: string;
  className?: string;
}): ReactNode {
  if (method === PAYMENT_METHOD_AIRTEL) return <AirtelMoneyLogo className={className} />;
  if (method === PAYMENT_METHOD_MTN) return <MtnMobileMoneyLogo className={className} />;
  if (method === PAYMENT_METHOD_VISA) return <VisaLogo className={className} />;
  if (method === PAYMENT_METHOD_BANK)
    return (
      <div className={`payment-bank-logo ${className ?? ''}`}>
        <span>🏦</span>
        <span>Bank</span>
      </div>
    );
  return <span>{method}</span>;
}
