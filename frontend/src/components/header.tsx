"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
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
  { label: "Associated Organizations", href: ROUTES.COMPANY_SETTINGS.ORGANIZATIONS },
];

// Distinct label from the "Associated Organizations" entry above — that one is
// 003's personal "which of my orgs is active" switcher; this is 007's owner-only
// org-to-org network listing. Same underlying epic name ("Associated Organizations
// (Network)"), deliberately disambiguated here since both would otherwise show up
// as identically-labeled sub-header links pointing at different pages.
const ASSOCIATED_ORGANIZATIONS_NETWORK_LINK = {
  label: "Associated Organizations (Network)",
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
              const isActive = link.activeMatch ? pathname.startsWith(link.activeMatch) : pathname === link.href;
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
