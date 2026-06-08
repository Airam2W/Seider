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
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { GithubAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { encryptData } from "./encryption.js";
import {
    initI18n,
    setLanguage,
    getLanguage,
    getStoredLanguageValue,
    syncLanguageFromUser,
    t,
    translatePage
} from "./i18n.js";

import {
    openCustomModal,
    closeCustomModal,
    customAlert,
    customConfirm
} from "./customModals.js";

await initI18n();
translatePage();

document.title = t("titles.home");

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

        const userData = userSnap.data() || {};

        await syncLanguageFromUser(userData);
        updateLanguageToggle();

        // =======================
        // NEW USER
        // =======================
        if (
            isNewUser ||
            !userData.onboardingCompleted
        ) {

            window.location.href = "/Seider/HTML/onboarding.html";
            return;
        }

        // =======================
        // EXISTING USER
        // =======================
        window.location.href = "/Seider/HTML/timeline.html";

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

document.getElementById("heroLoginBtn")?.addEventListener("click", () => {
    document.getElementById("btnLogin").click();
});

document.getElementById("ctaSignupBtn")?.addEventListener("click", () => {
    document.getElementById("btnSignup").click();
});

document.getElementById("ctaLoginBtn")?.addEventListener("click", () => {
    document.getElementById("btnLogin").click();
});

// =======================
// SCROLL TO TOP
// =======================
document.getElementById("btnScrollTop").onclick = () => {
    scrollToTop(true);
};

const btnScroll = document.getElementById("btnScrollTop");

if (btnScroll) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 1) {
            btnScroll.style.display = "block";
        }
        else {
            btnScroll.style.display = "none";
        }
    });
}

function scrollToTop(smooth = true) {
    window.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto"
    });
}


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
        customAlert(error.message, "Alert", "⚠️");

    }
};

document.getElementById("googleSignupBtn").onclick = async () => {

    try {
        await signInWithPopup(auth, provider);

    } catch (error) {

        console.error(error);
        customAlert(error.message, "Alert", "⚠️");
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

document.getElementById("githubSignupBtn").onclick = async () => {
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
        customAlert(t("alerts.invalidEmailFormat"), "Alert", "⚠️");
        return;
    }

    if (!validatePassword(password)) {
        customAlert(t("alerts.passwordMinLength"), "Alert", "⚠️");
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
        customAlert(t("alerts.nameMinLength"), "Alert", "⚠️");
        return;
    }

    if (!validateEmail(email)) {
        customAlert(t("alerts.invalidEmailFormat"), "Alert", "⚠️");
        return;
    }

    if (!validatePassword(password)) {
        customAlert(t("alerts.passwordMinLength"), "Alert", "⚠️");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
            displayName: name
        });

        customAlert(t("alerts.signupSuccess"), "Success", "✅");

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
            language: getStoredLanguageValue(),

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

            { id: "electricity", name: t("categories.electricity"), color: "#FF5733" },
            { id: "water", name: t("categories.water"), color: "#3399FF" },
            { id: "food", name: t("categories.food"), color: "#33FF57" },
            { id: "transport", name: t("categories.transport"), color: "#FF33A8" },
            { id: "entertainment", name: t("categories.entertainment"), color: "#FF8C33" },
            { id: "rent", name: t("categories.rent"), color: "#8C33FF" }

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
                subtags = [t("subcategories.groceries"), t("subcategories.restaurant")];
            }

            if (tag.id === "transport") {
                subtags = [t("subcategories.bus"), t("subcategories.car"), t("subcategories.taxi")];
            }

            if (tag.id === "entertainment") {
                subtags = [t("subcategories.movies"), t("subcategories.games")];
            }

            if (tag.id === "rent") {
                subtags = [t("subcategories.house"), t("subcategories.apartment")];
            }

            if (tag.id === "water") {
                subtags = [t("subcategories.bill")];
            }

            if (tag.id === "electricity") {
                subtags = [t("subcategories.bill")];
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
    let message = t("alerts.somethingWentWrong");

    switch (error.code) {
        case "auth/email-already-in-use":
            message = t("alerts.emailAlreadyInUse");
            break;
        case "auth/invalid-email":
            message = t("alerts.invalidEmail");
            break;
        case "auth/user-not-found":
            message = t("alerts.userNotFound");
            break;
        case "auth/wrong-password":
            message = t("alerts.wrongPassword");
            break;
        case "auth/weak-password":
            message = t("alerts.weakPassword");
            break;
        case "auth/popup-closed-by-user":
            message = t("alerts.popupClosed");
            break;
    }

    customAlert(message, "Alert", "⚠️");
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
            ? t("common.lightMode")
            : t("common.darkMode");
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

const languageToggle =
    document.getElementById("languageToggle");

const languageMenu =
    document.getElementById("languageMenu");

const languageOptions =
    document.querySelectorAll(".language-option");


// =======================
// UPDATE BUTTON
// =======================
function updateLanguageToggle() {

    const current = getLanguage();

    const labels = {
        en: t("languages.english"),
        es: t("languages.spanish"),
        ja: t("languages.japanese"),
        ko: t("languages.korean")
    };

    const arrow =
        languageMenu.classList.contains("hidden")
            ? "▾"
            : "▴";

    languageToggle.textContent =
        `${labels[current]} 🌐 ${arrow}`;
}


// =======================
// OPEN/CLOSE MENU
// =======================
languageToggle.onclick = () => {

    languageMenu.classList.toggle("hidden");

    updateLanguageToggle();
};


// =======================
// SELECT LANGUAGE
// =======================
languageOptions.forEach(button => {

    button.onclick = async () => {

        const selectedLang =
            button.dataset.lang;

        await setLanguage(selectedLang);

        translatePage();

        updateDarkModeButton();

        languageMenu.classList.add("hidden");

        updateLanguageToggle();

        const user = auth.currentUser;

        if (user) {

            await updateDoc(
                doc(db, "users", user.uid),
                {
                    language: selectedLang
                }
            );
        }
    };
});


// =======================
// CLOSE WHEN CLICK OUTSIDE
// =======================
document.addEventListener("click", (e) => {

    const wrapper =
        document.querySelector(".language-wrapper");

    if (!wrapper.contains(e.target)) {

        languageMenu.classList.add("hidden");

        updateLanguageToggle();
    }
});


// INITIAL
updateLanguageToggle();

// =======================
// NAV SCROLL BEHAVIOR
// =======================
const siteNav = document.getElementById("siteNav");
if (siteNav) {
    const onNavScroll = () => {
        siteNav.classList.toggle("nav-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onNavScroll, { passive: true });
    onNavScroll(); // run once on load
}

// =======================
// HERO SIGN UP BUTTON
// Clicks the primary #btnSignup trigger
// =======================
document.getElementById("heroSignupBtn")?.addEventListener("click", () => {
    document.getElementById("btnSignup").click();
});