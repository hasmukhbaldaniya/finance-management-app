import { redirect } from "next/navigation";
import { ROUTES } from "@/utils/constants/route.constant";

export default function Home() {
  redirect(ROUTES.DASHBOARD);
}
