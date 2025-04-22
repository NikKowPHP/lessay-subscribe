// File: src/components/AppLoadingIndicator.tsx
export default function AppLoadingIndicator() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-1 bg-opacity-90 backdrop-blur-sm">
      <div className="animate-spin h-12 w-12 border-4 border-neutral-3 border-t-accent-6 rounded-full mb-4" />
      <p className="text-lg font-medium text-neutral-12">Initializing App...</p>
      <p className="text-sm text-neutral-8">Please wait a moment.</p>
    </div>
  );
}
