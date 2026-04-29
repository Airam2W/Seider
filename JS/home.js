import { app, auth, provider } from "./firebase-config.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const db = getFirestore(app);

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

        await createUserIfNotExists(result.user);

        alert("Welcome " + result.user.displayName);

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
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        await createUserIfNotExists(userCredential.user);

        console.log("Login success:", userCredential.user);
        alert("Welcome " + userCredential.user.displayName);

        window.location.href = "/HTML/timeline.html";
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

        await createUserIfNotExists(userCredential.user);

        alert("Signup success");
        closeModal();

        openModal("login");


    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});


// =======================
// DB Firebase
// =======================
// CREATE USER IN FIRESTORE
async function createUserIfNotExists(user) {
    try {
        // Create user document
        await setDoc(
            doc(db, "users", user.uid),
            {
                name: user.displayName || "No Name",
                email: user.email
            },
            { merge: true }
        );

        // Create default tags (no duplicates)
        const tags = [
            { id: "electricity", name: "Electricity", color: "#FF5733" },
            { id: "water", name: "Water", color: "#3399FF" },
            { id: "food", name: "Food", color: "#33FF57" },
            { id: "transport", name: "Transport", color: "#FF33A8" },
            { id: "entertainment", name: "Entertainment", color: "#FF8C33" },
            { id: "rent", name: "Rent", color: "#8C33FF" }
        ];

        for (let tag of tags) {
            const tagRef = doc(db, "users", user.uid, "tags", tag.id);

            await setDoc(
                tagRef,
                {
                    name: tag.name,
                    color: tag.color
                },
                { merge: true }
            );

            // =======================
            // DEFAULT SUBTAGS
            // =======================
            let subtags = [];

            if (tag.id === "food") {
                subtags = ["Groceries", "Restaurant"];
            }

            if (tag.id === "transport") {
                subtags = ["Bus", "Car", "Taxi"];
            }

            if (tag.id === "entertainment") {
                subtags = ["Movies", "Games"];
            }

            if (tag.id === "rent") {
                subtags = ["House", "Apartment"];
            }

            if (tag.id === "water") {
                subtags = ["Bill"];
            }

            if (tag.id === "electricity") {
                subtags = ["Bill"];
            }

            for (let sub of subtags) {
                await setDoc(
                    doc(db, "users", user.uid, "tags", tag.id, "subtags", sub.toLowerCase()),
                    { name: sub },
                    { merge: true }
                );
            }
        }

    } catch (error) {
        console.error("Error creating user:", error);
    }
}