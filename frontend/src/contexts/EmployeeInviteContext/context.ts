import { createContext } from "react";
import type { EmployeeGender, EmployeeTitle } from "@/types/employee.type";

export type BasicInfo = {
  title: EmployeeTitle | "";
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  contactNumber: string;
  dob: string;
  gender: EmployeeGender | "";
  employeeCode: string;
};

export const EMPTY_BASIC_INFO: BasicInfo = {
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  countryCode: "+91",
  contactNumber: "",
  dob: "",
  gender: "",
  employeeCode: "",
};

export type EmployeeInviteState = {
  employeeId: number | null;
  basicInfo: BasicInfo;
  setEmployeeId: (employeeId: number) => void;
  setBasicInfo: (basicInfo: BasicInfo) => void;
  reset: () => void;
};

export const EmployeeInviteContext = createContext<EmployeeInviteState | null>(null);
