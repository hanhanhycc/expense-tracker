export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 to-white">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
