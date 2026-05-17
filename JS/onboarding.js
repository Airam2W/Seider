import { app, auth } from "./firebase-config.js";

import {
    getFirestore,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    initI18n,
    translatePage,
    t
} from "./i18n.js";

await initI18n();
translatePage();

document.title = t("titles.onboarding");

const db = getFirestore(app);

let currentStep = 1;

const totalSteps = 4;

const progressBar = document.getElementById("progressBar");

const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");

const finishBtn = document.getElementById("finishBtn");

// =======================
// DATA
// =======================
let onboardingData = {

    currency: "USD",

    gender: "no",
    ageRange: "no",

    currentBalance: 0,
    incomeFrequency: "no",

    financialGoal: "no"

};

// =======================
// OPTION BUTTONS
// =======================
document.querySelectorAll(".gender-btn").forEach(btn => {

    btn.onclick = () => {

        document.querySelectorAll(".gender-btn")
            .forEach(b => b.classList.remove("selected"));

        btn.classList.add("selected");

        onboardingData.gender = btn.dataset.value;
    };
});

document.querySelectorAll(".goal-btn").forEach(btn => {

    btn.onclick = () => {

        document.querySelectorAll(".goal-btn")
            .forEach(b => b.classList.remove("selected"));

        btn.classList.add("selected");

        onboardingData.financialGoal = btn.dataset.value;
    };
});

document.getElementById("currency").onchange = (e) => {

    onboardingData.currency = e.target.value;
}

// =======================
// NAVIGATION
// =======================
nextBtn.onclick = () => {

    saveCurrentStep();

    if (currentStep >= totalSteps) return;

    currentStep++;

    renderStep();
};

backBtn.onclick = () => {

    if (currentStep <= 1) return;

    currentStep--;

    renderStep();
};

// =======================
// RENDER STEP
// =======================
function renderStep() {

    document.querySelectorAll(".step")
        .forEach(step => step.classList.remove("active"));

    document
        .getElementById(`step-${currentStep}`)
        .classList.add("active");

    progressBar.style.width =
        `${(currentStep / totalSteps) * 100}%`;

    // LAST STEP
    if (currentStep === totalSteps) {

        nextBtn.style.display = "none";
        backBtn.style.display = "none";

    } else {

        nextBtn.style.display = "block";
        backBtn.style.display = "block";
    }
}

// =======================
// RENDER OPTIONS
// =======================

const currentBalanceInput = document.getElementById("currentBalance");

document.getElementById("incomeFrequency").onchange = (e) => {
    const value = e.target.value;
    if (value !== "no") {
        currentBalanceInput.style.display = "block";
    } else {
        currentBalanceInput.style.display = "none";
    }
};

// =======================
// SAVE CURRENT STEP
// =======================
function saveCurrentStep() {

    onboardingData.ageRange =
        document.getElementById("ageRange").value;

    onboardingData.currentBalance =
        Number(document.getElementById("currentBalance").value || 0);

    onboardingData.incomeFrequency =
        document.getElementById("incomeFrequency").value;

    onboardingData.currency = document.getElementById("currency").value;
}

// =======================
// FINISH
// =======================
finishBtn.onclick = async () => {

    try {

        const user = auth.currentUser;

        if (!user) return;

        await updateDoc(
            doc(db, "users", user.uid),
            {

                currency: onboardingData.currency,
                onboardingCompleted: true,

                profile: {

                    gender: onboardingData.gender,
                    ageRange: onboardingData.ageRange

                },

                finance: {

                    currentBalance: onboardingData.currentBalance,
                    incomeFrequency: onboardingData.incomeFrequency,
                    financialGoal: onboardingData.financialGoal

                }

            }
        );

        window.location.href = "/HTML/timeline.html";

    } catch (error) {

        console.error(error);
        alert(t("alerts.errorSavingOnboarding"));
    }
};

renderStep();


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