import { app, auth, provider } from "./firebase-config.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// =======================
// UI
// =======================
const modal = document.getElementById("modal");
const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

function openModal(type) {
    modal.classList.remove("hidden");

    loginBox.classList.add("hidden");
    signupBox.classList.add("hidden");

    if (type === "login") loginBox.classList.remove("hidden");
    if (type === "signup") signupBox.classList.remove("hidden");
}

function closeModal() {
    modal.classList.add("hidden");
}

// BUTTONS
document.getElementById("btnLogin").onclick = () => openModal("login");
document.getElementById("btnSignup").onclick = () => openModal("signup");

// CLICK
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

// GLOBAL
window.closeModal = closeModal;


// =======================
// GOOGLE LOGIN
// =======================
document.getElementById("googleBtn").onclick = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        alert("Welcome " + result.user.displayName);
        console.log(result.user);

        // Redireccionar a otra página
        window.location.href = "/HTML/timeline.html";
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};


// =======================
// LOGIN EMAIL
// =======================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const user = await signInWithEmailAndPassword(auth, email, password);
        alert("Login success");
        console.log(user.user);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});


// =======================
// SIGN UP
// =======================
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
            displayName: name
        });

        alert("Account created");
        console.log(userCredential.user);

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});