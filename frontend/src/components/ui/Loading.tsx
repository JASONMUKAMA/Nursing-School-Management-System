export function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loading-inline">
      <div className="spinner spinner-sm" />
      <span>{message}</span>
    </div>
  );
}
