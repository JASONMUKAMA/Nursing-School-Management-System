declare global {
  interface Window {
    __NSMS_PURGING__?: boolean;
  }
}

if (!window.__NSMS_PURGING__) {
  void import('./main');
}
