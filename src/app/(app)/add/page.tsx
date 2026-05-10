import { requireAuth } from "@/lib/guards";
import { TransactionForm } from "@/features/transactions/components/transaction-form";

export default async function AddPage() {
  const session = await requireAuth();
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Thêm giao dịch</h1>
      <TransactionForm currentMemberId={session.user.memberId} />
    </div>
  );
}
