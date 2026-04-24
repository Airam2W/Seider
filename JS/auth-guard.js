import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.warn("User not authenticated, redirecting...");
        window.location.href = "../../index.html";
    } else {
        console.log("User authenticated:", user.email);
    }
});