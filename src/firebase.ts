import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCV1YAlWEaV40expVhsDjGiuJEfrgvldfs",
  authDomain: "temporal-inscriber-rd2jw.firebaseapp.com",
  projectId: "temporal-inscriber-rd2jw",
  storageBucket: "temporal-inscriber-rd2jw.firebasestorage.app",
  messagingSenderId: "3221243355",
  appId: "1:3221243355:web:a4856cd6c673727cf093fe"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-campusride-dcbbd432-0315-4019-a4d6-3fefbc6e8a2e");
