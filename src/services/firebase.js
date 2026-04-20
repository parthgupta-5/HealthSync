import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRz3xWhHErpq678Xh4mlNmEu1EDUUSPQk",
  authDomain: "hospital-10090.firebaseapp.com",
  projectId: "hospital-10090",
  storageBucket: "hospital-10090.firebasestorage.app",
  messagingSenderId: "584719824545",
  appId: "1:584719824545:web:17392baa941310935ae2e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
