import { createContext } from "react";
import type { EmployeeTitle } from "@/types/employee.type";

export type OnboardingState = {
  token: string;
  email: string;
  title: EmployeeTitle | "";
  firstName: string;
  lastName: string;
  countryCode: string;
  contactNumber: string;
  setToken: (token: string) => void;
  setEmail: (email: string) => void;
  setTitle: (title: EmployeeTitle | "") => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setCountryCode: (countryCode: string) => void;
  setContactNumber: (contactNumber: string) => void;
  reset: () => void;
};

export const OnboardingContext = createContext<OnboardingState | null>(null);
