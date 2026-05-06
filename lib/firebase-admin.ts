import admin from "firebase-admin";
import 'dotenv/config';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin SDK: Warning - Missing environment variables. Server might fail during database operations.");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    } as any),
  });
}

export const adminDb = admin.firestore();
