// Sending email: password resets and Contact messages. Set SMTP_URL (e.g.
// smtps://user:pass@smtp.example.com:465) and MAIL_FROM to send through any provider. Without
// them nothing is sent: the message is written to the server log instead, so the flows still
// work on a development machine or a staging server that has no mail set up.
import "server-only";
import nodemailer from "nodemailer";

export async function sendMail(message: { to: string; subject: string; text: string; replyTo?: string }): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.info(`[mail not configured] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    return;
  }
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM || "Heart Over Money <no-reply@heartovermoney.com>", ...message });
}
