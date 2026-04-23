export const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function fetchBackend(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http")
    ? path
    : `${DEFAULT_BACKEND_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
    },
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return response;
}