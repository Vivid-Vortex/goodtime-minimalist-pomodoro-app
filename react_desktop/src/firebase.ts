import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAqLG-0VF8CmAHpV_yD7hP7G7XAd2V0ASY',
  authDomain: 'timesheetkotlin.firebaseapp.com',
  projectId: 'timesheetkotlin',
  storageBucket: 'timesheetkotlin.firebasestorage.app',
  messagingSenderId: '280298807639',
  appId: '1:280298807639:android:351b84363382c311655e12',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
