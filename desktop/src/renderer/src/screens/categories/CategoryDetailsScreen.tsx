// Ported from frontend/src/app/(private)/company-settings/categories/[id]/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
// <Suspense> dropped — it existed only because CategoryDetailsView uses
// useSearchParams internally, a Next-specific requirement react-router's
// own useSearchParams has no equivalent of.
import { useParams } from "react-router";
import { CategoryDetailsView } from "@/components/category/category-details-view";

export function CategoryDetailsScreen() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);

  return <CategoryDetailsView categoryId={categoryId} />;
}
