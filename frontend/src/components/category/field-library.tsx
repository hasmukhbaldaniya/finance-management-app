import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Stack spacing={1} sx={{ width: { xs: "100%", md: 224 }, flexShrink: 0, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Field Library
      </Typography>
      <Stack spacing={0.5}>
        {CATEGORY_FIELD_TYPES.map((fieldType) => (
          <Button
            key={fieldType}
            type="button"
            variant="outline"
            disabled={disabledTypes.has(fieldType)}
            onClick={() => onAdd(fieldType)}
            sx={{ width: "100%", justifyContent: "flex-start", fontWeight: 400 }}
          >
            {CATEGORY_FIELD_TYPE_LABELS[fieldType]}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
