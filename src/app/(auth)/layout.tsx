export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">{children}</div>
    </main>
  );
}
