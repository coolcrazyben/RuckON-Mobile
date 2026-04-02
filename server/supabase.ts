import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url) throw new Error("SUPABASE_URL must be set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key);
}

/**
 * Upload a base64-encoded image to Supabase Storage and return the public URL.
 * @param base64Data - Full data URI (data:image/jpeg;base64,...) or raw base64 string
 * @param folder - Storage folder (e.g., "avatars", "route-images")
 * @param fileName - Unique file name (e.g., "userId-timestamp.jpg")
 * @returns Public URL string
 */
export async function uploadImage(
  base64Data: string,
  folder: string,
  fileName: string,
): Promise<string> {
  const supabase = getSupabaseClient();

  // Strip data URI prefix if present
  const raw = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  // Detect content type from data URI or default to jpeg
  const contentType = base64Data.startsWith("data:image/png")
    ? "image/png"
    : "image/jpeg";

  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(filePath, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  return publicUrl;
}
