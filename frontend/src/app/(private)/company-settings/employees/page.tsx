import Link from "next/link";
import { ComingSoon } from "@/components/coming-soon";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants/route.constant";

export default function EmployeeManagementPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-4 pt-6">
        <Button render={<Link href={ROUTES.EMPLOYEE_INVITE.BASIC_INFO}>Invite Employee</Link>} />
      </div>
      <ComingSoon title="Employee Management" />
    </div>
  );
}
