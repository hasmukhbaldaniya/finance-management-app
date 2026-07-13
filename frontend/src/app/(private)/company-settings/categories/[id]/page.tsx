"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import { CategoryDetailsView } from "@/components/category/category-details-view";
import { Spinner } from "@/components/ui/spinner";

export default function CategoryDetailsPage() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);

  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Spinner size={24} />
        </Box>
      }
    >
      <CategoryDetailsView categoryId={categoryId} />
    </Suspense>
  );
}
