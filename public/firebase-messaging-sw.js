// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
firebase.initializeApp({
  apiKey: "AIzaSyAnWtDYMqOk1Wo0lfv55ZANpN7qKtWivXY",
  authDomain: "managermobie.firebaseapp.com",
  projectId: "managermobie",
  storageBucket: "managermobie.firebasestorage.app",
  messagingSenderId: "1016081409873",
  appId: "1:1016081409873:web:1f4abb0b7ab0f8e1469570",
  measurementId: "G-521771R7NC"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // You can customize this to any path in the public directory
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
