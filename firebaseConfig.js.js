import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBUDuaUnT8mFVG8dT2Vgq7QWQ0YpsosArQ",
  authDomain: "career-navigator-ai-1f880.firebaseapp.com",
  projectId: "career-navigator-ai-1f880",
  storageBucket: "career-navigator-ai-1f880.firebasestorage.app",
  messagingSenderId: "133817322924",
  appId: "1:133817322924:web:7fca0352e6b195fabcbe09"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;