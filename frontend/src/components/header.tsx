"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { logout } from "@/apis/auth";
import { Logo } from "@/components/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

type HeaderProps = {
  user: AuthUser;
  organization: Organization | null;
  isOwner: boolean;
};

const COMPANY_SETTINGS_BASE_PATH = "/company-settings";

const NAV_LINKS = [
  { label: "Dashboard", href: ROUTES.DASHBOARD },
  { label: "Trips", href: ROUTES.TRIPS },
  { label: "Claims", href: ROUTES.CLAIMS },
  { label: "Approvals", href: ROUTES.APPROVALS },
  { label: "Finance", href: ROUTES.FINANCE },
  { label: "Company Settings", href: ROUTES.COMPANY_SETTINGS.EMPLOYEES, activeMatch: COMPANY_SETTINGS_BASE_PATH },
  { label: "Help", href: ROUTES.HELP },
];

const COMPANY_SETTINGS_LINKS = [
  { label: "Employee management", href: ROUTES.COMPANY_SETTINGS.EMPLOYEES },
  { label: "Categories management", href: ROUTES.COMPANY_SETTINGS.CATEGORIES },
  { label: "Roles & privileges", href: ROUTES.COMPANY_SETTINGS.ROLES_PRIVILEGES },
  { label: "Grades", href: ROUTES.COMPANY_SETTINGS.GRADES },
  { label: "Departments", href: ROUTES.COMPANY_SETTINGS.DEPARTMENTS },
];

// 007's owner-only org-to-org network listing (Employee is now the login
// entity and is always scoped to exactly one organization, so 003's old
// personal "which of my orgs is active" switcher no longer applies — this is
// the only "Associated Organizations" link left).
const ASSOCIATED_ORGANIZATIONS_NETWORK_LINK = {
  label: "Associated Organizations",
  href: ROUTES.COMPANY_SETTINGS.ASSOCIATED_ORGANIZATIONS,
};

const navLinkSx = {
  borderRadius: 1.5,
  px: 1.5,
  py: 0.75,
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "text.secondary",
  textDecoration: "none",
  transition: "background-color 0.15s, color 0.15s",
  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
  '&[aria-current="page"]': { bgcolor: "action.hover", color: "text.primary" },
} as const;

const subNavLinkSx = {
  borderRadius: 1.5,
  px: 1.5,
  py: 0.5,
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "text.secondary",
  textDecoration: "none",
  transition: "background-color 0.15s, color 0.15s",
  "&:hover": { bgcolor: "background.paper", color: "text.primary" },
  '&[aria-current="page"]': { bgcolor: "background.paper", color: "text.primary", boxShadow: 1 },
} as const;

export function Header({ user, organization, isOwner }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const companySettingsLinks = isOwner
    ? [...COMPANY_SETTINGS_LINKS, ASSOCIATED_ORGANIZATIONS_NETWORK_LINK]
    : COMPANY_SETTINGS_LINKS;

  const isOnCompanySettings = pathname.startsWith(COMPANY_SETTINGS_BASE_PATH);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
      router.push(ROUTES.LOGIN);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      toast.error(message);
    }
  }

  return (
    <>
      <Stack
        component="header"
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5 }}
      >
        <Logo />

        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          <Stack component="nav" direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            {NAV_LINKS.map((link) => {
              // A section's nav link stays highlighted for every route
              // nested under it (e.g. /claims/new, /claims/123/manual all
              // count as "Claims"), not just its own exact path — every
              // link's own href already doubles as that section's base
              // path, except Company Settings, which keeps its explicit
              // activeMatch since its own href points at one sub-page
              // (Employees) rather than the shared /company-settings root.
              const isActive = link.activeMatch
                ? pathname.startsWith(link.activeMatch)
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Box key={link.href} component={Link} href={link.href} aria-current={isActive ? "page" : undefined} sx={navLinkSx}>
                  {link.label}
                </Box>
              );
            })}
          </Stack>

          <DropdownMenu>
            <DropdownMenuTrigger
              sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 0.75, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
            >
              {user.name}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                {organization ? (
                  <Typography variant="caption" color="text.secondary">
                    {organization.name}
                  </Typography>
                ) : null}
              </Box>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={ROUTES.PROFILE}>View Profile</Link>} />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Stack>
      </Stack>

      {isOnCompanySettings ? (
        <Stack component="nav" direction="row" spacing={0.5} aria-label="Company Settings" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1 }}>
          {companySettingsLinks.map((link) => (
            <Box key={link.href} component={Link} href={link.href} aria-current={pathname === link.href ? "page" : undefined} sx={subNavLinkSx}>
              {link.label}
            </Box>
          ))}
        </Stack>
      ) : null}
    </>
  );
}
