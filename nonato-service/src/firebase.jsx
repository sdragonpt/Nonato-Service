// firebase.jsx
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDOeKFgshAXOgqMACwjP-KA2MLU10Fs_A8",
  authDomain: "nonato-service.firebaseapp.com",
  projectId: "nonato-service",
  storageBucket: "nonato-service.appspot.com",
  messagingSenderId: "896475175219",
  appId: "1:896475175219:web:872d29d21f0798622ec646",
  measurementId: "G-38ZWZRQ3KZ"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = getFirestore(app);

// Inicializa Analytics (opcional)
const analytics = getAnalytics(app);

export { db };