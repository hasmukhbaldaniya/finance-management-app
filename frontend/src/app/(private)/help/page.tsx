"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { openZohoSalesIqChat } from "@/components/zoho-salesiq-widget";
import { useSession } from "@/contexts/SessionContext";

export default function HelpPage() {
  const { isSalesIqAvailable } = useSession();

  return (
    <Stack spacing={1.5} sx={{ flex: 1, alignItems: "center", justifyContent: "center", px: 2, py: 5, textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        Help
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Need a hand? Our support team is here to help.
      </Typography>
      {isSalesIqAvailable ? (
        <Button type="button" onClick={openZohoSalesIqChat} sx={{ mt: 1 }}>
          <ChatCircleDotsIcon size={16} /> Chat with Us
        </Button>
      ) : null}
    </Stack>
  );
}
