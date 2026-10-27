// The QR code on a collector card's registration: staff scan it at the door, and it opens the
// card on /admin/check-in, where they mark it handed over.
import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/site";

export const checkInUrl = (code: string) => `${siteUrl()}/admin/check-in?code=${encodeURIComponent(code)}`;

export const checkInQr = (code: string, width = 160) => QRCode.toString(checkInUrl(code), { type: "svg", margin: 0, width });
