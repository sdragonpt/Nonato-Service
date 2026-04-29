// Configuração Firebase para a app-v2.
//
// Aponta para o MESMO projeto Firebase do Nonato-Service actual
// (sergionunoribeiro@gmail.com / projecto "nonato-service").
// Em desenvolvimento, podes sobrepor estes valores via `.env.local`
// (NEXT_PUBLIC_FIREBASE_*) caso queiras usar um projeto separado de
// staging — útil para testar sem tocar na produção.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyDOeKFgshAXOgqMACwjP-KA2MLU10Fs_A8",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "nonato-service.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nonato-service",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "nonato-service.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "896475175219",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:896475175219:web:872d29d21f0798622ec646",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-38ZWZRQ3KZ",
};

const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(
  app,
  "gs://nonato-service.firebasestorage.app"
);
export { app };
