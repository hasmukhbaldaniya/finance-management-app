"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CaretLeftIcon, PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants/route.constant";

// 022's Create Claim entry point — a pure fork, no shared fields live here.
export default function CreateClaimEntryPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => router.push(ROUTES.CLAIMS)}>
          <CaretLeftIcon size={14} /> Back
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Create Claim</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href={ROUTES.CLAIM_NEW_AI}
          className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-green-500 bg-green-50/50 p-6 transition-colors hover:bg-green-50"
        >
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
            <SparkleIcon size={14} /> AI Powered
          </span>
          <h2 className="text-lg font-semibold">Automated Extraction</h2>
          <p className="text-sm text-muted-foreground">Upload your bills and let AI read and fill in the details for you.</p>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
            Proceed <ArrowRightIcon size={14} />
          </span>
        </Link>

        <Link href={ROUTES.CLAIM_NEW_MANUAL} className="flex flex-col gap-3 rounded-lg border border-border p-6 transition-colors hover:bg-muted/50">
          <h2 className="text-lg font-semibold">Enter your expense details manually</h2>
          <p className="text-sm text-muted-foreground">Add each expense by hand, one or more at a time.</p>
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium">
            <PlusIcon size={14} /> Add Expense
          </span>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p>Each image you upload becomes one bill. For PDFs, every page is treated as a separate bill.</p>
        <p>If your bill has multiple pages, merge them into a single PDF before uploading.</p>
      </div>

      <div className="rounded-lg border border-border p-4 text-sm">
        <h3 className="mb-1 font-semibold">What happens next?</h3>
        <p className="text-muted-foreground">
          Save your claim as a draft to keep working on it later, or save it to submit — it&apos;ll then move through your organization&apos;s approval
          process before being reimbursed.
        </p>
      </div>
    </div>
  );
}
