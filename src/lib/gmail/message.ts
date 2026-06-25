// Build an RFC 2822 message and base64url-encode it for the Gmail API.
// Pure + self-checkable; no network.

export type MailParts = {
  from: string;
  to: string;
  subject: string;
  body: string;
};

export function buildRfc822({ from, to, subject, body }: MailParts): string {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

export function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function encodeMessage(parts: MailParts): string {
  return toBase64Url(buildRfc822(parts));
}
