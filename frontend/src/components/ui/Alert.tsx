import { useEffect, useRef } from 'react';
import { toast } from '../../utils/toast';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

/** Shows a toastr notification and clears parent state via onClose. */
export function Alert({ type = 'info', message, onClose }: AlertProps) {
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!message || shownRef.current === message) return;
    shownRef.current = message;

    if (type === 'error') toast.error(message);
    else if (type === 'success') toast.success(message);
    else toast.info(message);

    onClose?.();
  }, [type, message, onClose]);

  return null;
}
