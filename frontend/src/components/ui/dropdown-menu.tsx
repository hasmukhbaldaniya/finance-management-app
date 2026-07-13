"use client";

import { cloneElement, createContext, isValidElement, useContext, useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem, { type MenuItemProps as MuiMenuItemProps } from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import type { SxProps, Theme } from "@mui/material/styles";

// 026's MUI Migration — only the sub-components real call sites actually
// use (DropdownMenu/DropdownMenuTrigger/DropdownMenuContent/
// DropdownMenuItem/DropdownMenuCheckboxItem/DropdownMenuSeparator) are
// kept; DropdownMenuGroup/Label/Sub*/Radio*/Shortcut/Portal had zero real
// callers and are dropped rather than kept as unused exports.
//
// MUI's Menu is a controlled `anchorEl`/`open`/`onClose` component, unlike
// Base UI's declarative Trigger+Popup split — DropdownMenu holds the
// anchor element in a small context so Trigger/Content can stay
// declarative from the outside, matching every existing call site's shape
// exactly.

type DropdownMenuContextValue = {
  anchorEl: HTMLElement | null;
  openMenu: (event: MouseEvent<HTMLElement>) => void;
  closeMenu: () => void;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(): DropdownMenuContextValue {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenu.* components must be used within <DropdownMenu>");
  return context;
}

function DropdownMenu({ children }: { children: ReactNode }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <DropdownMenuContext.Provider
      value={{
        anchorEl,
        openMenu: (event) => setAnchorEl(event.currentTarget),
        closeMenu: () => setAnchorEl(null),
      }}
    >
      {children}
    </DropdownMenuContext.Provider>
  );
}

type DropdownMenuTriggerProps = {
  render?: ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;
  className?: string;
  children?: ReactNode;
};

// Supports both existing usage shapes: a plain trigger with its own
// className/children (header.tsx's Profile button), or Base UI's `render`
// composition prop wrapping an existing element (the searchable pickers'
// own outlined Button trigger) — cloned with onClick wired in either way.
function DropdownMenuTrigger({ render, className, children }: DropdownMenuTriggerProps) {
  const { openMenu } = useDropdownMenuContext();
  if (render && isValidElement(render)) {
    return cloneElement(render, { onClick: openMenu });
  }
  return (
    <button type="button" className={className} onClick={openMenu}>
      {children}
    </button>
  );
}

type DropdownMenuContentProps = {
  align?: "start" | "end";
  sx?: SxProps<Theme>;
  /** Matches the popup's width to its trigger's rendered width — the MUI
   * equivalent of Base UI's `w-(--anchor-width)` anchor-sizing utility. */
  matchTriggerWidth?: boolean;
  children: ReactNode;
};

function DropdownMenuContent({ align = "start", sx, matchTriggerWidth = false, children }: DropdownMenuContentProps) {
  const { anchorEl, closeMenu } = useDropdownMenuContext();
  return (
    <MuiMenu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: align === "end" ? "right" : "left" }}
      transformOrigin={{ vertical: "top", horizontal: align === "end" ? "right" : "left" }}
      slotProps={{ paper: { sx: { ...(matchTriggerWidth && anchorEl ? { width: anchorEl.offsetWidth } : {}), ...sx } } }}
    >
      {children}
    </MuiMenu>
  );
}

type DropdownMenuItemProps = Omit<MuiMenuItemProps, "component" | "render"> & {
  render?: ReactElement<{ onClick?: (event: MouseEvent) => void }>;
  variant?: "default" | "destructive";
};

// Supports the `render` composition pattern too (header.tsx's "View
// Profile" item renders as a real <Link>, not a <li>-wrapped button).
function DropdownMenuItem({ render, variant = "default", onClick, sx, children, ...props }: DropdownMenuItemProps) {
  const { closeMenu } = useDropdownMenuContext();
  const colorSx = variant === "destructive" ? { color: "error.main" } : undefined;

  if (render && isValidElement(render)) {
    return (
      <MuiMenuItem
        component={render.type as React.ElementType}
        {...(render.props as Record<string, unknown>)}
        sx={{ ...colorSx, ...sx }}
        onClick={(event: MouseEvent) => {
          closeMenu();
          render.props.onClick?.(event);
        }}
      />
    );
  }

  return (
    <MuiMenuItem
      sx={{ ...colorSx, ...sx }}
      onClick={(event) => {
        closeMenu();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </MuiMenuItem>
  );
}

type DropdownMenuCheckboxItemProps = Omit<MuiMenuItemProps, "onClick"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  closeOnClick?: boolean;
};

// The multi-select picker pattern (policy-eligibility-section.tsx,
// ziptrrip-category-picker.tsx) — the whole row toggles the checkbox;
// `closeOnClick={false}` (their own default usage) keeps the menu open
// across multiple picks, matching Base UI's own `closeOnClick` behavior.
function DropdownMenuCheckboxItem({ checked = false, onCheckedChange, closeOnClick = true, children, ...props }: DropdownMenuCheckboxItemProps) {
  const { closeMenu } = useDropdownMenuContext();
  return (
    <MuiMenuItem
      onClick={() => {
        onCheckedChange?.(!checked);
        if (closeOnClick) closeMenu();
      }}
      {...props}
    >
      <Checkbox checked={checked} onChange={() => {}} size="small" sx={{ mr: 1, p: 0 }} />
      {children}
    </MuiMenuItem>
  );
}

function DropdownMenuSeparator() {
  return <Divider sx={{ my: 0.5 }} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator };
