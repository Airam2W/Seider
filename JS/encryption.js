import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const auth = getAuth();

function getSecretKey() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No user logged in");
    }
    return user.uid + user.email;
}

export function encryptData(text) {
    if (!text) return "";
    const SECRET_KEY = getSecretKey();

    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

export function decryptData(cipher) {
    if (!cipher) return "";
    const SECRET_KEY = getSecretKey();

    const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}
