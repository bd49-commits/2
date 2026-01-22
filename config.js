export const firebaseConfig = {
    apiKey: "AIzaSyCeeGLHTUeS00negMM4o2rIiOxymb915So",
    authDomain: "jdsiksj.firebaseapp.com",
    projectId: "jdsiksj",
    storageBucket: "jdsiksj.firebasestorage.app",
    messagingSenderId: "556584218260",
    appId: "1:556584218260:web:57ae482f07a0ec0055ce81"
  };

export const hashPass = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
};
