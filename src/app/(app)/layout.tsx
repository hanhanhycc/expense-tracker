import { requireAuth } from "@/lib/guards";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <Providers>
      <TopBar />
      <main className="max-w-5xl mx-auto px-4 py-4 pb-32 desktop:pb-8">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </Providers>
  );
}
