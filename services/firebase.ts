import { initializeApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBn2aqX8YtvjIvw1aK0p9Fy3D0nfj8ndkI",
  authDomain: "career-navigator-ai-f8f06.firebaseapp.com",
  projectId: "career-navigator-ai-f8f06",
  storageBucket: "career-navigator-ai-f8f06.firebasestorage.app",
  messagingSenderId: "64608194722",
  appId: "1:64608194722:android:4d7cae0ea8e5f1821107fb",
};

export const googleWebClientId = "64608194722-mpgu093eekbgo9q58teetkdbvgup0vfr.apps.googleusercontent.com";

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
