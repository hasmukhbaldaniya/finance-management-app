import {
  CONTACT_NUMBER_REGEX,
  EMAIL_REGEX,
  EMPLOYEE_NAME_REGEX,
  GST_REGEX,
  NAME_REGEX,
  OTP_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
} from "@/utils/constants/regex.constant";

export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

export function isValidIdentifier(value: string): boolean {
  return isEmail(value) || isPhone(value);
}

export function isValidOtp(value: string): boolean {
  return OTP_REGEX.test(value);
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_REGEX.test(value);
}

export function isValidGstNumber(value: string): boolean {
  return GST_REGEX.test(value);
}

export function isValidName(value: string): boolean {
  return NAME_REGEX.test(value);
}

export function isValidEmployeeName(value: string): boolean {
  return EMPLOYEE_NAME_REGEX.test(value);
}

export function isValidContactNumber(value: string): boolean {
  return CONTACT_NUMBER_REGEX.test(value);
}

export function calculateAge(dob: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const hasNotHadBirthdayYet =
    today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}
