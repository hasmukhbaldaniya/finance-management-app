"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCategory, updateCategoryBasicDetails } from "@/apis/category";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_CATEGORY_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MIN_CATEGORY_NAME_LENGTH } from "@/utils/constants/category.constant";
import { CATEGORY_STEP_SEGMENTS } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import { WizardFooter } from "./wizard-footer";
import { ZiptrripCategoryPicker } from "./ziptrrip-category-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FieldErrors = {
  name?: string;
  description?: string;
};

function validate(name: string, description: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) {
    errors.name = "Category Name is required.";
  } else if (name.trim().length < MIN_CATEGORY_NAME_LENGTH || name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
    errors.name = `Category Name must be between ${MIN_CATEGORY_NAME_LENGTH} and ${MAX_CATEGORY_NAME_LENGTH} characters.`;
  }
  if (!description.trim()) {
    errors.description = "Description is required.";
  } else if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`;
  }
  return errors;
}

export function BasicDetailsForm() {
  const router = useRouter();
  const wizard = useCategoryWizard();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingContinue, setIsSavingContinue] = useState(false);

  const showSaveAsDraft = wizard.status !== "active";

  async function persist(isDraftSave: boolean): Promise<number | null> {
    const payload = {
      name: wizard.name.trim(),
      description: wizard.description.trim(),
      ziptrripCategoryIds: wizard.ziptrripCategoryIds,
      isDraftSave,
    };

    if (wizard.categoryId === null) {
      const response = await createCategory(payload);
      wizard.setCategoryId(response.id);
      wizard.setStatus(response.status);
      return response.id;
    }

    await updateCategoryBasicDetails(wizard.categoryId, payload);
    return wizard.categoryId;
  }

  async function handleSaveAsDraft(): Promise<void> {
    setIsSavingDraft(true);
    try {
      await persist(true);
      toast.success("Category saved as draft.");
      router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveAndContinue(): Promise<void> {
    const validationErrors = validate(wizard.name, wizard.description);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const wasNewCategory = wizard.categoryId === null;
    setIsSavingContinue(true);
    try {
      const id = await persist(false);
      if (id === null) return;
      // A Duplicate session's copied fields/policies already live in context
      // at this point but only exist server-side under the *source*
      // category — protect them from being clobbered the moment Step 2's
      // own useLoadCategory fetches this brand-new (still-empty) category.
      if (wasNewCategory) {
        wizard.setSkipNextLoadForCategoryId(id);
      }
      wizard.markStepReached(1);
      router.push(ROUTES.categoryStep(id, CATEGORY_STEP_SEGMENTS.expenseForm));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      if (message.toLowerCase().includes("name")) {
        setErrors((current) => ({ ...current, name: message }));
      } else {
        toast.error(message);
      }
    } finally {
      setIsSavingContinue(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-background p-8">
      <div className="space-y-2">
        <Label htmlFor="category-name">Category Name</Label>
        <Input
          id="category-name"
          value={wizard.name}
          onChange={(event) => wizard.setName(event.target.value)}
          placeholder="e.g. Domestic Flight"
          maxLength={MAX_CATEGORY_NAME_LENGTH}
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-description">Description</Label>
        <Textarea
          id="category-description"
          value={wizard.description}
          onChange={(event) => wizard.setDescription(event.target.value)}
          placeholder="Describe when this category should be used..."
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Our AI learns from this text to categorize uploaded bills. Write a clear, detailed description for best auto-categorization
          results.
        </p>
        {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>Map Ziptrrip Category</Label>
        <ZiptrripCategoryPicker selectedKeys={wizard.ziptrripCategoryIds} onChange={wizard.setZiptrripCategoryIds} />
      </div>

      <WizardFooter
        showSaveAsDraft={showSaveAsDraft}
        primaryLabel="Save & Continue"
        isSavingDraft={isSavingDraft}
        isSavingPrimary={isSavingContinue}
        onSaveAsDraft={handleSaveAsDraft}
        onPrimary={handleSaveAndContinue}
      />
    </div>
  );
}
