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
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { GithubAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { encryptData } from "./encryption.js";

const githubProvider = new GithubAuthProvider();

const db = getFirestore(app);

// =======================
// AUTH
// =======================
onAuthStateChanged(auth, async (user) => {

    document.body.classList.remove("hidden");

    if (!user) return;

    try {

        const isNewUser = await createUserIfNotExists(user);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        const userData = userSnap.data();

        // =======================
        // NEW USER
        // =======================
        if (
            isNewUser ||
            !userData.onboardingCompleted
        ) {

            window.location.href = "/HTML/onboarding.html";
            return;
        }

        // =======================
        // EXISTING USER
        // =======================
        window.location.href = "/HTML/timeline.html";

    } catch (error) {
        console.error(error);
    }
});

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


const goSignup =
    document.getElementById("goSignup");

const goLogin =
    document.getElementById("goLogin");

// =======================
// SWITCH TO SIGNUP
// =======================
goSignup.onclick = () => {

    loginBox.classList.add("hidden");
    signupBox.classList.remove("hidden");

};

// =======================
// SWITCH TO LOGIN
// =======================
goLogin.onclick = () => {

    signupBox.classList.add("hidden");
    loginBox.classList.remove("hidden");

};


// =======================
// GOOGLE LOGIN
// =======================
document.getElementById("googleBtn").onclick = async () => {

    try {

        await signInWithPopup(auth, provider);

    } catch (error) {

        console.error(error);
        alert(error.message);

    }
};

// =======================
// GITHUB LOGIN
// =======================
document.getElementById("githubBtn").onclick = async () => {

    try {

        await signInWithPopup(auth, githubProvider);

    } catch (error) {

        handleFirebaseError(error);

    }
};


// =======================
// LOGIN EMAIL
// =======================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!validateEmail(email)) {
        alert("Invalid email format");
        return;
    }

    if (!validatePassword(password)) {
        alert("Password must be at least 6 characters");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);

    } catch (error) {
        handleFirebaseError(error);
    }
});


// =======================
// SIGN UP
// =======================
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();

    if (!validateName(name)) {
        alert("Name must be at least 2 characters");
        return;
    }

    if (!validateEmail(email)) {
        alert("Invalid email format");
        return;
    }

    if (!validatePassword(password)) {
        alert("Password must be at least 6 characters");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
            displayName: name
        });

        alert("Signup success");

    } catch (error) {
        handleFirebaseError(error);
    }
});


// =======================
// DB Firebase
// =======================
// CREATE USER IN FIRESTORE
// =======================
// CREATE USER
// =======================
async function createUserIfNotExists(user) {

    try {

        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        // =======================
        // USER EXISTS
        // =======================
        if (userSnap.exists()) {
            return false;
        }

        // =======================
        // CREATE USER
        // =======================
        await setDoc(userRef, {

            name: encryptData(user.displayName) || encryptData("No Name"),
            email: encryptData(user.email),

            currency: "USD",

            entryCount: 0,

            onboardingCompleted: false,

            createdAt: Date.now(),

            profile: {

                ageRange: "no",
                gender: "no"

            },

            finance: {

                currentBalance: 0,
                incomeFrequency: "no",
                financialGoal: "no"

            }

        });

        // =======================
        // DEFAULT TAGS
        // =======================
        const tags = [

            { id: "electricity", name: "Electricity", color: "#FF5733" },
            { id: "water", name: "Water", color: "#3399FF" },
            { id: "food", name: "Food", color: "#33FF57" },
            { id: "transport", name: "Transport", color: "#FF33A8" },
            { id: "entertainment", name: "Entertainment", color: "#FF8C33" },
            { id: "rent", name: "Rent", color: "#8C33FF" }

        ];

        for (let tag of tags) {

            const tagRef = doc(
                db,
                "users",
                user.uid,
                "tags",
                tag.id
            );

            await setDoc(tagRef, {

                name: tag.name,
                color: tag.color

            });

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
                    doc(
                        db,
                        "users",
                        user.uid,
                        "tags",
                        tag.id,
                        "subtags",
                        sub.toLowerCase()
                    ),
                    {
                        name: sub
                    }
                );
            }
        }

        return true;

    } catch (error) {

        console.error(error);

        return false;
    }
}

// =======================
// VALIDATIONS
// =======================
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateName(name) {
    return name.trim().length >= 2;
}

function handleFirebaseError(error) {
    let message = "Something went wrong";

    switch (error.code) {
        case "auth/email-already-in-use":
            message = "Email already in use";
            break;
        case "auth/invalid-email":
            message = "Invalid email";
            break;
        case "auth/user-not-found":
            message = "User not found";
            break;
        case "auth/wrong-password":
            message = "Wrong password";
            break;
        case "auth/weak-password":
            message = "Password should be at least 6 characters";
            break;
        case "auth/popup-closed-by-user":
            message = "Popup closed";
            break;
    }

    alert(message);
}



// =======================
// DARK MODE TOGGLE
// =======================
const darkModeToggle =
    document.getElementById("darkModeToggle");

// =======================
// APPLY SAVED MODE IMMEDIATELY
// =======================

const darkMode =
    localStorage.getItem("darkMode") === "true";

if (darkMode) {

    document.body.classList.add("dark-mode");

}

// =======================
// UPDATE BUTTON TEXT
// =======================

function updateDarkModeButton() {

    const isDarkMode =
        document.body.classList.contains("dark-mode");

    darkModeToggle.textContent =
        isDarkMode
            ? "Light Mode"
            : "Dark Mode";
}

// INITIAL BUTTON STATE
updateDarkModeButton();

// =======================
// TOGGLE
// =======================

darkModeToggle.onclick = () => {

    document.body.classList.toggle("dark-mode");

    const isDarkMode =
        document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "darkMode",
        isDarkMode
    );

    updateDarkModeButton();
};