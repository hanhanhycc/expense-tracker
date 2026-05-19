import { requireAuth } from "@/lib/guards";
import { TransactionForm } from "@/features/transactions/components/transaction-form";

export default async function AddPage() {
  const session = await requireAuth();
  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <h1 className="text-2xl font-extrabold tracking-tight mb-4 px-1">Thêm giao dịch</h1>
      <TransactionForm currentMemberId={session.user.memberId} />
    </div>
  );
}
