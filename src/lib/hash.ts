export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-512"

export const hashAlgorithms: HashAlgorithm[] = ["SHA-256", "SHA-1", "SHA-512"]

export async function hashBytes(
  data: ArrayBuffer,
  algorithm: HashAlgorithm,
): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
