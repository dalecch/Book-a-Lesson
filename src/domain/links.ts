export function bookingPath(slug: string, token: string): string {
  return `/book/${slug}?invite=${encodeURIComponent(token)}`;
}

export function joinPath(token: string): string {
  return `/join/${encodeURIComponent(token)}`;
}

export function payPath(paymentId: string): string {
  return `/pay/${paymentId}`;
}

export function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function whatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
