"use client";

import { useContext } from "react";
import { EmployeeInviteContext, type EmployeeInviteState } from "./context";

export function useEmployeeInvite(): EmployeeInviteState {
  const context = useContext(EmployeeInviteContext);
  if (!context) {
    throw new Error("useEmployeeInvite must be used within an EmployeeInviteProvider");
  }
  return context;
}
