const CLIENT_ID_STORAGE_KEY = "prospecting.client-id";

export function getClientId(): string {
  const existingId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existingId !== null) {
    return existingId;
  }

  const clientId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  return clientId;
}

export async function getClient(): Promise<{ client_id: string }> {
  const response = await fetch("/api/v1/client", {
    headers: { "X-Client-Id": getClientId() },
  });

  if (!response.ok) {
    throw new Error("Could not initialize anonymous client.");
  }

  return response.json() as Promise<{ client_id: string }>;
}
