import sodium from "libsodium-wrappers";

let ready: Promise<void> | null = null;

async function ensureReady() {
  if (!ready) ready = sodium.ready;
  await ready;
}

export async function encryptForGitHubSecret(publicKeyB64: string, plaintext: string) {
  await ensureReady();
  const keyBytes = sodium.from_base64(publicKeyB64, sodium.base64_variants.ORIGINAL);
  const messageBytes = sodium.from_string(plaintext);
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
  return sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);
}
