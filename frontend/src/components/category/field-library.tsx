import { Button } from "@/components/ui/button";
import { CATEGORY_FIELD_TYPES, CATEGORY_FIELD_TYPE_LABELS } from "@/utils/constants/category.constant";
import type { CategoryFieldType } from "@/types/category.type";

type FieldLibraryProps = {
  disabledTypes: Set<CategoryFieldType>;
  onAdd: (fieldType: CategoryFieldType) => void;
};

// Click-to-add only — reordering already-added fields is the only drag
// interaction 013 specifies (see that story's Open Questions).
export function FieldLibrary({ disabledTypes, onAdd }: FieldLibraryProps) {
  return (
    <div className="w-full shrink-0 space-y-2 rounded-lg border border-border bg-background p-4 md:w-56">
      <h2 className="text-sm font-semibold">Field Library</h2>
      <div className="space-y-1">
        {CATEGORY_FIELD_TYPES.map((fieldType) => (
          <Button
            key={fieldType}
            type="button"
            variant="outline"
            disabled={disabledTypes.has(fieldType)}
            onClick={() => onAdd(fieldType)}
            className="w-full justify-start font-normal"
          >
            {CATEGORY_FIELD_TYPE_LABELS[fieldType]}
          </Button>
        ))}
      </div>
    </div>
  );
}
