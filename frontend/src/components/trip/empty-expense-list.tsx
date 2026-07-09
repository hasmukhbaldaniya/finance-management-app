import { ChatCircleDotsIcon } from "@phosphor-icons/react";

// The expense list is always empty in this story — logging an expense
// against a trip is a future Claims/Expenses story's concern (020's own Out
// of Scope). This component has nothing to check; it renders unconditionally.
export function EmptyExpenseList() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600">
        <ChatCircleDotsIcon size={24} />
      </span>
      <p className="font-semibold">No expenses added yet</p>
      <p className="text-sm text-muted-foreground">No expenses have been added to this claim.</p>
    </div>
  );
}
