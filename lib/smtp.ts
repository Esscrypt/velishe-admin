import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );
}

export function createSmtpTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    throw new Error("SMTP is not configured");
  }

  const port = parseInt(smtpPort, 10);
  const isSecure = port === 465;

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: isSecure,
      auth: {
        user: smtpUser.trim(),
        pass: smtpPassword.trim(),
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      requireTLS: !isSecure,
    }),
    from: smtpUser.trim(),
  };
}
