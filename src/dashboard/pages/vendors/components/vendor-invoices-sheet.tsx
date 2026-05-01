"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Invoice } from "@/types/wedding";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

interface VendorInvoicesSheetProps {
  vendorId: string | null;
  vendorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allInvoices: Invoice[];
  currency: string;
}

export function VendorInvoicesSheet({
  vendorId,
  vendorName,
  open,
  onOpenChange,
  allInvoices,
  currency,
}: VendorInvoicesSheetProps) {
  const invoices: Invoice[] = vendorId
    ? allInvoices.filter((inv) => inv.vendorId === vendorId)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle className="text-base">Invoices</SheetTitle>
          <p className="text-muted-foreground text-sm font-normal">{vendorName}</p>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
          {invoices.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No invoices for this vendor.</p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-medium">{inv.invoiceNumber || "Invoice"}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{inv.category}</p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{fmt(inv.amount, currency)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge type="payment" value={inv.paymentStatus} className="text-xs" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => window.open(inv.fileUrl || "#", "_blank")}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
