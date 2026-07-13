"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { label: "Home", href: ROUTES.DASHBOARD },
  { label: "Trips", href: ROUTES.TRIPS },
  { label: "Claims", href: ROUTES.CLAIMS },
  { label: "Approvals", href: ROUTES.APPROVALS },
  { label: "Finance", href: ROUTES.FINANCE },
  { label: "Reports", href: ROUTES.REPORTS },
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

const NAV_LINK_CLASSNAME =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground";

const SUB_NAV_LINK_CLASSNAME =
  "rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm";

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
      <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3">
        <Logo />

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-1">
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
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={NAV_LINK_CLASSNAME}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
              {user.name}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-1.5 py-1">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                {organization ? <p className="text-xs text-muted-foreground">{organization.name}</p> : null}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={ROUTES.PROFILE}>View Profile</Link>} />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isOnCompanySettings ? (
        <nav
          aria-label="Company Settings"
          className="flex items-center gap-1 border-b border-border bg-muted/40 px-4 py-2"
        >
          {companySettingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={SUB_NAV_LINK_CLASSNAME}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
