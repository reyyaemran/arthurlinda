import { redirect } from "next/navigation";

import { BudgetCombinedPage } from "@/dashboard/pages/budget-combined";
import { getSession } from "@/lib/auth/session";
import {
  budgetCategoriesWithSpent,
  getWeddingForUser,
  listExpensesViewModels,
  listInvoicesViewModels,
  listVendorsViewModels,
} from "@/lib/wedding/queries";

export default async function AdminBudgetPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) redirect("/admin/login");

  const [categories, expenses, invoices, vendors] = await Promise.all([
    budgetCategoriesWithSpent(wedding.id),
    listExpensesViewModels(wedding.id),
    listInvoicesViewModels(wedding.id),
    listVendorsViewModels(wedding.id),
  ]);

  return (
    <BudgetCombinedPage
      categories={categories}
      expenses={expenses}
      invoices={invoices}
      vendors={vendors}
      currency={wedding.currency}
    />
  );
}
