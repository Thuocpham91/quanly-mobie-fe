import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './client';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnWtDYMqOk1Wo0lfv55ZANpN7qKtWivXY",
  authDomain: "managermobie.firebaseapp.com",
  projectId: "managermobie",
  storageBucket: "managermobie.firebasestorage.app",
  messagingSenderId: "1016081409873",
  appId: "1:1016081409873:web:1f4abb0b7ab0f8e1469570",
  measurementId: "G-521771R7NC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Request permission and register token to backend
export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get registration token
      const currentToken = await getToken(messaging);
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // Register token to backend API
        await api.post('/notifications/fcm-token', {
          token: currentToken,
          deviceType: 'web',
        });
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
      }
    } else {
      console.warn('Notification permission not granted.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token: ', err);
  }
  return null;
};

// Listen for incoming messages while app is in foreground
export const onMessageListener = (callback: (payload: any) => void) =>
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
