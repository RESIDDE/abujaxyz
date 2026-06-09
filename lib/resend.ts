import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "abujacars.com";
