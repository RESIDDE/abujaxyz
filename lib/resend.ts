import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY environment variable");
    _resend = new Resend(key);
  }
  return _resend;
}

// Keep backward compat export
export const resend = new Resend(process.env.RESEND_API_KEY || "placeholder");

export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "lekksideexpo.com";
