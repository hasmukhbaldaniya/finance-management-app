"use client";

import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { openZohoSalesIqChat } from "@/components/zoho-salesiq-widget";
import { useSession } from "@/contexts/SessionContext";

export default function HelpPage() {
  const { isSalesIqAvailable } = useSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
      <p className="text-sm text-muted-foreground">Need a hand? Our support team is here to help.</p>
      {isSalesIqAvailable ? (
        <Button type="button" onClick={openZohoSalesIqChat} className="mt-2">
          <ChatCircleDotsIcon size={16} /> Chat with Us
        </Button>
      ) : null}
    </div>
  );
}
