// Admin script: grant Premium to a user by email.
// Usage:
//   1. Download a Firebase service-account JSON from
//      Firebase Console → Project settings → Service accounts → Generate new private key
//   2. Save it as scripts/serviceAccount.json (DO NOT commit this file)
//   3. Run:  node scripts/grantPremium.js user@example.com
//
// Requires: npm i firebase-admin   (run once inside scripts/)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, "serviceAccount.json");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/grantPremium.js <email>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

try {
  const user = await auth.getUserByEmail(email);
  await db.collection("users").doc(user.uid).set(
    {
      isPremium: true,
      premiumGrantedAt: new Date().toISOString(),
      email: user.email,
    },
    { merge: true }
  );
  console.log(`Granted Premium to ${user.email} (uid: ${user.uid})`);
  process.exit(0);
} catch (error) {
  console.error("Failed to grant Premium:", error?.message || error);
  process.exit(1);
}
