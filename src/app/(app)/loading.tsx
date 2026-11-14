// Skeleton shown while any page inside the app is loading its data.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
