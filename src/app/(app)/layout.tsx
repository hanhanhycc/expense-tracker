import { requireAuth } from "@/lib/guards";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { ConfettiHost } from "@/components/confetti";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <Providers>
      <TopBar />
      <main className="max-w-5xl mx-auto px-4 py-5 pb-36 desktop:pb-8">{children}</main>
      <BottomNav />
      <InstallPrompt />
      <ConfettiHost />
    </Providers>
  );
}
