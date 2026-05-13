import { requireAuth } from "@/lib/guards";
import { NotificationsClient } from "@/features/notifications/components/notifications-client";

export default async function NotificationsPage() {
  await requireAuth();
  return <NotificationsClient />;
}
