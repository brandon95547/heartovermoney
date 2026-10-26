// The site's public address, for links that leave the site (QR codes on certificates).
export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
