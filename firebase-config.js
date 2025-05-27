// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfxC230uQw4WB_iALCYFMXniZfQwUkpfc",
  authDomain: "cosmiccanvas-6b5a0.firebaseapp.com",
  projectId: "cosmiccanvas-6b5a0",
  storageBucket: "cosmiccanvas-6b5a0.firebasestorage.app",
  messagingSenderId: "190984165965",
  appId: "1:190984165965:web:bd6df8b9efcecdbba35a04",
  measurementId: "G-3XMK86XT6M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Signs up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<UserCredential>} User credential object
 */
export async function signUpWithEmail(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error in signUpWithEmail:', error.message);
    throw error;
  }
}

/**
 * Signs in an existing user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<UserCredential>} User credential object
 */
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error in loginWithEmail:', error.message);
    throw error;
  }
}

/**
 * Signs in a user using Google authentication
 * @returns {Promise<UserCredential>} User credential object
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error in signInWithGoogle:', error.message);
    throw error;
  }
}

/**
 * Signs out the currently logged-in user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error in logoutUser:', error.message);
    throw error;
  }
}

/**
 * Listens to authentication state changes
 * @param {function} callback - Callback function to handle auth state changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
} 