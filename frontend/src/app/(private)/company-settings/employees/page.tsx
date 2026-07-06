import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/utils/constants/route.constant";

export default function EmployeeManagementPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-4 pt-6">
        <Link href={ROUTES.EMPLOYEE_INVITE} className={cn(buttonVariants())}>
          Invite Employee
        </Link>
      </div>
      <ComingSoon title="Employee Management" />
    </div>
  );
}
