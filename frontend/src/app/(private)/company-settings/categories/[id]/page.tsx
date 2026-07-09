"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { CategoryDetailsView } from "@/components/category/category-details-view";
import { Spinner } from "@/components/ui/spinner";

export default function CategoryDetailsPage() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      }
    >
      <CategoryDetailsView categoryId={categoryId} />
    </Suspense>
  );
}
