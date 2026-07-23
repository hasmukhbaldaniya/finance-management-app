"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { ArrowRightIcon, CaretLeftIcon, PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { statusTones } from "@/theme/colors";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants/route.constant";

// 022's Create Claim entry point — a pure fork, no shared fields live here.
export default function CreateClaimEntryPage() {
  const router = useRouter();

  return (
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 896, px: 3, py: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Button type="button" variant="outline" size="sm" onClick={() => router.push(ROUTES.CLAIMS)}>
          <CaretLeftIcon size={14} /> Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
          Create Claim
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
        <Stack
          component={Link}
          href={ROUTES.CLAIM_NEW_AI}
          spacing={1.5}
          sx={{
            borderRadius: 2,
            border: 2,
            borderStyle: "dashed",
            borderColor: "success.main",
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
            p: 3,
            textDecoration: "none",
            color: "inherit",
            transition: "background-color 0.15s",
            "&:hover": { bgcolor: (theme) => alpha(theme.palette.success.main, 0.08) },
          }}
        >
          <Chip
            icon={<SparkleIcon size={14} />}
            label="AI Powered"
            size="small"
            sx={{ alignSelf: "flex-start", fontWeight: 500, bgcolor: statusTones.accepted.background, color: statusTones.accepted.text, "& .MuiChip-icon": { color: "inherit" } }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Automated Extraction
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your bills and let AI read and fill in the details for you.
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: "auto", fontSize: "0.875rem", fontWeight: 500, color: "success.dark" }}>
            Proceed <ArrowRightIcon size={14} />
          </Stack>
        </Stack>

        <Stack
          component={Link}
          href={ROUTES.CLAIM_NEW_MANUAL}
          spacing={1.5}
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            p: 3,
            textDecoration: "none",
            color: "inherit",
            transition: "background-color 0.15s",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Enter your expense details manually
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add each expense by hand, one or more at a time.
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: "auto", fontSize: "0.875rem", fontWeight: 500 }}>
            <PlusIcon size={14} /> Add Expense
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "action.hover", p: 2, fontSize: "0.875rem", color: "text.secondary" }}>
        <Typography variant="body2" color="text.secondary">
          Each image you upload becomes one bill. For PDFs, every page is treated as a separate bill.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          If your bill has multiple pages, merge them into a single PDF before uploading.
        </Typography>
      </Box>

      <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", p: 2, fontSize: "0.875rem" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          What happens next?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Save your claim as a draft to keep working on it later, or save it to submit — it&apos;ll then move through your organization&apos;s approval
          process before being reimbursed.
        </Typography>
      </Box>
    </Stack>
  );
}
