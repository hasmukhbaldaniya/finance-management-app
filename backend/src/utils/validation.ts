import { EMAIL_REGEX, OTP_REGEX, PASSWORD_REGEX, PHONE_REGEX } from "./constants/regex.constant";

export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

export function isValidIdentifier(value: string): boolean {
  return isEmail(value) || isPhone(value);
}

export function normalizePhone(value: string): string {
  return value.startsWith("+91") ? value.slice(3) : value;
}

export function isValidOtp(value: string): boolean {
  return OTP_REGEX.test(value);
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_REGEX.test(value);
}
