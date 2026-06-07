import toastr from 'toastr';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  configured = true;

  toastr.options = {
    closeButton: true,
    debug: false,
    newestOnTop: true,
    progressBar: true,
    positionClass: 'toast-top-right',
    preventDuplicates: true,
    showDuration: 300,
    hideDuration: 300,
    timeOut: 5000,
    extendedTimeOut: 2000,
    showEasing: 'swing',
    hideEasing: 'linear',
    showMethod: 'fadeIn',
    hideMethod: 'fadeOut',
  };
}

function show(type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) {
  ensureConfigured();
  toastr[type](message, title);
}

export const toast = {
  success: (message: string, title?: string) => show('success', message, title),
  error: (message: string, title?: string) => show('error', message, title),
  info: (message: string, title?: string) => show('info', message, title),
  warning: (message: string, title?: string) => show('warning', message, title),
  notification: (title: string, message: string) => show('info', message, title),
};
