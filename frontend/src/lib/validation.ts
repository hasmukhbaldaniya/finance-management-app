export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
export const OTP_REGEX = /^\d{6}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
