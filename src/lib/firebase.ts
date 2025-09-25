import { initializeApp, getApp, getApps } from 'firebase/app';

const firebaseConfig = {
  "projectId": "studio-7650080096-85e78",
  "appId": "1:224410690634:web:fd7049d7bccd217cfb32b3",
  "storageBucket": "studio-7650080096-85e78.firebasestorage.app",
  "apiKey": "AIzaSyB_wb2ZkVH51BRj7g_dq5mLz1eD4uRbCTo",
  "authDomain": "studio-7650080096-85e78.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "224410690634"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
