/**
 * Chat Service: Client-side and API wrapper for 1-to-1 Private Messages
 * Supports both plaintext and E2EE encrypted payloads with media attachments.
 */

export interface ChatMediaMetadata {
  url: string;
  type: "image" | "video" | "voice" | "gif" | string;
  name: string;
  size: number;
}

export interface SendMessagePayload {
  body: string;
  iv?: string;
  is_encrypted?: boolean;
  media?: ChatMediaMetadata;
  visitor_id?: string;
  sender?: "recipient" | "creator";
  client_id?: string;
}

export interface FetchMessagesOptions {
  since?: string;
  limit?: number;
  inbox?: boolean;
}

export interface CreatorMessageRecord {
  id: string;
  client_id?: string | null;
  visitor_id: string;
  sender: "recipient" | "creator";
  body: string;
  created_at: string;
  read_at: string | null;
  media_url?: string | null;
  media_type?: "image" | "video" | "voice" | "gif" | null;
  media_name?: string | null;
  media_size?: number | null;
  iv?: string | null;
  is_encrypted?: boolean;
  persisted?: boolean;
  storage_tier?: "database" | "volatile_fallback";
}

export interface SendMessageResult {
  message?: CreatorMessageRecord;
  error?: string;
}

export interface FetchMessagesResult {
  messages: CreatorMessageRecord[];
  error?: string;
}

export interface UploadMediaResult {
  url: string;
  error?: string;
}

/**
 * Sends a chat message (encrypted or plaintext) to the server.
 */
export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
  try {
    const res = await fetch("/api/creator-messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || `Failed to send message (${res.status})` };
    }

    return { message: data.message };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { error: message };
  }
}

/**
 * Fetches recent chat messages for the current conversation.
 * Supports cursor-based filtering with `since` and count limit.
 */
export async function fetchMessages(options?: FetchMessagesOptions): Promise<FetchMessagesResult> {
  try {
    const params = new URLSearchParams();
    if (options?.since) {
      params.set("since", options.since);
    }
    if (options?.limit) {
      params.set("limit", String(options.limit));
    }
    if (options?.inbox) {
      params.set("inbox", "1");
    }

    const query = params.toString();
    const url = `/api/creator-messages${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { messages: [], error: data.error || `Failed to load messages (${res.status})` };
    }

    return { messages: data.messages || [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { messages: [], error: message };
  }
}

/**
 * Uploads media attachment to private Supabase storage.
 * If `encryptedBlob` is provided, uploads the encrypted binary payload;
 * otherwise uploads the raw file/blob.
 *
 * @param file Original File or Blob descriptor (used for name/type metadata)
 * @param encryptedBlob Optional encrypted binary Blob (when E2EE is enabled)
 * @returns Resolves with access URL or error message
 */
export async function uploadChatMedia(
  file: File | Blob,
  encryptedBlob?: Blob
): Promise<UploadMediaResult> {
  try {
    const uploadPayload = encryptedBlob || file;
    const formData = new FormData();

    const fileName =
      file instanceof File
        ? file.name
        : "attachment.bin";

    formData.append("file", uploadPayload, fileName);
    if (encryptedBlob) {
      formData.append("is_encrypted", "true");
    }

    const res = await fetch("/api/creator-messages/media", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { url: "", error: data.error || `Failed to upload media (${res.status})` };
    }

    return { url: data.url || "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Media upload failed";
    return { url: "", error: message };
  }
}
