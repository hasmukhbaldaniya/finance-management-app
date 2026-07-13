"use client";

import { createContext, useContext, type ReactNode } from "react";
import MuiDialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { XIcon } from "@phosphor-icons/react";
import type { SxProps, Theme } from "@mui/material/styles";

// 026's MUI Migration — every real call site in this app only ever uses
// Dialog/DialogContent/DialogHeader/DialogFooter/DialogTitle/
// DialogDescription with `open`/`onOpenChange`, always controlled
// externally (never DialogTrigger/DialogClose/showCloseButton — those
// existed in the old Base UI primitive but had zero real callers, so
// they're dropped here rather than kept as unused exports).
//
// `Dialog` holds {open, onOpenChange} in context, since MUI's own Dialog
// component (unlike Base UI's Root+Popup split) is a single component
// that needs `open` directly — `DialogContent` reads the context and is
// the one that actually renders MUI's Dialog, mirroring how
// DialogPrimitive.Root/Popup were already split before this migration.
// DialogHeader/arbitrary content/DialogFooter are all rendered as plain
// flow children inside one padded, gapped Box, the same flat structure
// the old primitive's single `p-4 gap-4` popup already used — DialogFooter
// just adds its own top border/background rather than MUI's own
// DialogActions (which assumes it owns the whole bottom slot).

type DialogContextValue = { open: boolean; onOpenChange?: (open: boolean) => void };
const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog.* components must be used within <Dialog>");
  return context;
}

function Dialog({ open, onOpenChange, children }: DialogContextValue & { children: ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogContent({ className, sx, children }: { className?: string; sx?: SxProps<Theme>; children: ReactNode }) {
  const { open, onOpenChange } = useDialogContext();
  return (
    <MuiDialog open={open} onClose={() => onOpenChange?.(false)} slotProps={{ paper: { className, sx } }}>
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
        <IconButton aria-label="Close" onClick={() => onOpenChange?.(false)} size="small" sx={{ position: "absolute", top: 8, right: 8 }}>
          <XIcon />
        </IconButton>
        {children}
      </Box>
    </MuiDialog>
  );
}

function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Box className={className} sx={{ display: "flex", flexDirection: "column", gap: 0.5, pr: 4 }}>
      {children}
    </Box>
  );
}

function DialogTitle({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 500 }} className={className}>
      {children}
    </Typography>
  );
}

function DialogDescription({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Typography component="p" variant="body2" color="text.secondary" className={className}>
      {children}
    </Typography>
  );
}

function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: { xs: "column-reverse", sm: "row" },
        justifyContent: { sm: "flex-end" },
        gap: 1,
        borderTop: 1,
        borderColor: "divider",
        mx: -2,
        mb: -2,
        p: 2,
        bgcolor: "action.hover",
      }}
    >
      {children}
    </Box>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
