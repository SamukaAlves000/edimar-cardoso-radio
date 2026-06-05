import {initializeApp, getApps, FirebaseApp} from 'firebase/app';
import {getFirestore, Firestore} from 'firebase/firestore';
import {getStorage, FirebaseStorage} from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCFmYr5LF4Yai5Xodhj_NVYTpJ4GPB0juE",
    authDomain: "radio-web-52f64.firebaseapp.com",
    projectId: "radio-web-52f64",
    storageBucket: "radio-web-52f64.firebasestorage.app",
    messagingSenderId: "527925827133",
    appId: "1:527925827133:web:eed1161de5762a8f43bc54",
    measurementId: "G-EL1FC1QPK8"
};

const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
