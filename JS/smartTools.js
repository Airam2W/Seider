import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    predictFuture,
} from "./tools/future.js";

import {
    setupSearchInput,
    startSearch,
    loadTagFilters,
    clearFilters
} from "./tools/search.js";

import {
    loadInsights
} from "./tools/spending.js";

import {
    loadComparison
} from "./tools/comparison.js";

const db = getFirestore();

const modalFuture = document.getElementById("modalFuture");
const modalSearch = document.getElementById("modalSearch");
const modalSpending = document.getElementById("modalSpending");
const modalComparison = document.getElementById("modalComparison");

const modalContentFuture = document.getElementById("modalContentFuture");
const modalContentSearch = document.getElementById("modalContentSearch");
const modalContentSpending = document.getElementById("modalContentSpending");
const modalContentComparison = document.getElementById("modalContentComparison");

export let currentUser = null;



// =======================
// AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
});

// =======================
// NAVIGATION
// =======================
document.getElementById("timeline").onclick = async () => {
    const user = currentUser;

    if (!user) return;

    try {

        window.location.href = "/HTML/timeline.html";

    } catch (error) {
        console.error(error);
    }
};

document.getElementById("btnLogout").onclick = async () => {
    await signOut(auth);
    window.location.href = "/index.html";
};

document.getElementById("settings").onclick = async () => {
    const user = currentUser;

    if (!user) return;

    try {

        window.location.href = "/HTML/settings.html";

    } catch (error) {
        console.error(error);
    }
};

export async function getUserEntries(uid) {
    try {
        const q = query(
            collection(db, "users", uid, "entries"),
            orderBy("date", "asc") // 🔥 IMPORTANTE
        );

        const snapshot = await getDocs(q);

        const entries = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            entries.push({
                id: docSnap.id,
                ...data
            });
        });

        return entries;

    } catch (error) {
        console.error("Error getting entries:", error);
        return [];
    }
}

// =======================
// MODAL
// =======================

function openModal(section) {
    if (section == 1) {
        modalContentFuture.classList.remove("hidden");
        modalFuture.classList.remove("hidden");
    } else if (section == 2) {
        modalContentSearch.classList.remove("hidden");
        modalSearch.classList.remove("hidden");
    } else if (section == 3) {
        modalContentSpending.classList.remove("hidden");
        modalSpending.classList.remove("hidden");
    } else if (section == 4) {
        modalContentComparison.classList.remove("hidden");
        modalComparison.classList.remove("hidden");
    }
}

function closeModal() {
    modalFuture.classList.add("hidden");
    modalSearch.classList.add("hidden");
    modalSpending.classList.add("hidden");
    modalComparison.classList.add("hidden");
}

window.closeModal = closeModal;

// cerrar al hacer click afuera
modalFuture.addEventListener("click", (e) => {
    if (e.target === modalFuture) closeModal();
});
modalSearch.addEventListener("click", (e) => {
    if (e.target === modalSearch) closeModal();
});
modalSpending.addEventListener("click", (e) => {
    if (e.target === modalSpending) closeModal();
});
modalComparison.addEventListener("click", (e) => {
    if (e.target === modalComparison) closeModal();
});

// =======================
// SIMULATIONS
// =======================

// =======================
// VERIFICATION
// =======================
async function verificationForSimulation(user, minEntries = 3) {
    // let simulationOK = verificationForSimulation(currentUser, N);
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const count = snap.data().entryCount || -1;

    if (count >= minEntries) return true;

    if (count === -1) {
        alert("User data not found");
        return false;
    }

    alert("No tienes suficientes entries "+count+" (min: "+minEntries+")");
    return false;
}

// =======================
// SIMULATE THE FUTURE (1)
// =======================
document.getElementById("btnStartFuture").onclick = () => {
    openModal(1);
};



// =======================
// SEARCH
// =======================
document.getElementById("btnStartSearch").onclick = () => {
    openModal(2);

    setupSearchInput();
    loadTagFilters();
};

// =======================
// Spending Insights
// =======================
document.getElementById("btnStartAnalysis").onclick = () => {
    openModal(3);
    loadInsights();
};

// =======================
// Insights Comparison
// =======================
document.getElementById("btnStartComparison").onclick = () => {
    openModal(4);
    loadComparison();
}












// =======================
// DATA SIMULATION
// =======================

document.getElementById("btnSim1").onclick = () => simulateUser("1");
document.getElementById("btnSim2").onclick = () => simulateUser("2");
document.getElementById("btnSim3").onclick = () => simulateUser("3");

document.getElementById("btnDeleteEntries").onclick = deleteAllEntries;


// =======================
// SIMULACIÓN PRINCIPAL
// =======================
async function simulateUser(type) {

    if (!currentUser) {
        alert("User not logged");
        return;
    }

    const entriesRef = collection(db, "users", currentUser.uid, "entries");

    const today = new Date();

    let entriesCreated = 0;
    let attempts = 0;

    while (entriesCreated < 30 && attempts < 100) {

        attempts++;

        // 🔥 fecha aleatoria entre hoy y 60 días atrás
        const date = randomDateWithinDays(60);

        // 🔥 probabilidad de que ese día tenga actividad
        if (Math.random() < 0.5) continue;

        const entry = generateEntryByType(type, date);

        await addDoc(entriesRef, {
            date,
            ...entry
        });

        entriesCreated++;
    }

    alert("30 entries creados de forma realista 🚀");
}


// =======================
// GENERADOR POR PERFIL
// =======================
function generateEntryByType(type, date) {

    const day = date.getDay(); // 0=domingo, 6=sábado
    const isWeekend = (day === 0 || day === 6);

    if (type === "1") return generateUno(isWeekend);
    if (type === "2") return generateDos(isWeekend);
    if (type === "3") return generateTres(isWeekend);
}


// =======================
// UNO (social, gasta más en finde)
// =======================
function generateUno(isWeekend) {

    const possibleItems = [
        () => ["Food", "Restaurant", rand(200, 500)],
        () => ["Food", "Groceries", rand(150, 350)],
        () => ["Transport", "Taxi", rand(80, 250)],
        () => ["Entertainment", "Movies", rand(120, 300)],
        () => ["Entertainment", "Shopping", rand(400, 1200)],
        () => ["Entertainment", "Makeup", rand(200, 800)],
        () => ["Transport", "Uber", rand(100, 300)],
        () => ["Food", "Coffee", rand(60, 150)]
    ];

    const items = [];

    const expenses = pickRandomItems(possibleItems, isWeekend ? 3 : 2);

    items.push(...expenses.map(e => createItem(...e())));

    const notesPool = [
        "Salida con amigas 💅",
        "Compras de ropa y maquillaje",
        "Día de café y selfies ☕",
        "Cita casual ❤️",
        "Día de shopping fuerte 🛍️",
        "Cena en restaurante bonito",
        "Plan improvisado con amigas",
        "Antojo y caprichos del día 😅",
        "Día movido entre salidas",
        "Compré cosas que no necesitaba 😆"
    ];

    return buildEntry(items, randomFrom(notesPool));
}


// =======================
// DOS (tranquilo, bajo gasto)
// =======================
function generateDos(isWeekend) {

    const possibleItems = [
        () => ["Food", "Groceries", rand(80, 180)],
        () => ["Food", "Restaurant", rand(90, 200)],
        () => ["Transport", "Bus", rand(20, 60)],
        () => ["Entertainment", "Games", rand(50, 300)],
        () => ["Entertainment", "Streaming", rand(50, 150)],
        () => ["Food", "Snacks", rand(40, 120)],
        () => ["Food", "Delivery", rand(100, 250)],
        () => ["Transport", "Uber", rand(80, 200)]
    ];

    const items = [];

    const expenses = pickRandomItems(possibleItems, isWeekend ? 4 : 2);

    items.push(...expenses.map(e => createItem(...e())));

    const notesPool = [
        "Día tranquilo en casa",
        "Jugando videojuegos",
        "Pedido de comida porque flojera cocinar",
        "Día de clases normal",
        "Compré snacks para la semana",
        "Maratón de YouTube",
        "Poco movimiento hoy",
        "Día relajado",
        "Comida rápida y estudio",
        "Descansando y jugando"
    ];

    return buildEntry(items, randomFrom(notesPool));
}


// =======================
// TRES (balanceada)
// =======================
function generateTres(isWeekend) {

    const possibleItems = [
        () => ["Food", "Groceries", rand(120, 300)],
        () => ["Food", "Restaurant", rand(100, 250)],
        () => ["Transport", "Bus", rand(20, 50)],
        () => ["Entertainment", "Movies", rand(80, 180)],
        () => ["Education", "Books", rand(150, 400)],
        () => ["Health", "Pharmacy", rand(80, 200)],
        () => ["Food", "Coffee", rand(50, 120)],
        () => ["Transport", "Uber", rand(80, 200)]
    ];

    const items = [];

    const expenses = pickRandomItems(possibleItems, isWeekend ? 3 : 2);

    items.push(...expenses.map(e => createItem(...e())));

    const notesPool = [
        "Día productivo 📚",
        "Compras necesarias del hogar",
        "Salida tranquila con amigas",
        "Estudiando y organizando cosas",
        "Día equilibrado",
        "Aprendiendo algo nuevo",
        "Pequeños gastos del día",
        "Día relajado pero útil",
        "Organizando mi semana",
        "Tiempo personal y descanso"
    ];

    return buildEntry(items, randomFrom(notesPool));
}


// =======================
// HELPERS
// =======================
function pickRandomItems(pool, count) {
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count); // 🔥 SOLO devuelve arrays
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function createItem(tag, subtag, amount, type = "expense") {
    return {
        tag,
        subtag,
        plus: type === "income" ? amount : 0,
        minus: type === "expense" ? amount : 0,
        receipt: null
    };
}

function buildEntry(items, notes) {

    let total = 0;
    const tagTotals = {};
    const subtagTotals = {};

    
    items.forEach(item => {
        total += (item.plus - item.minus);

        if (!tagTotals[item.tag]) tagTotals[item.tag] = 0;
        if (!subtagTotals[item.tag]) subtagTotals[item.tag] = {};

        if (!subtagTotals[item.tag][item.subtag]) {
            subtagTotals[item.tag][item.subtag] = 0;
        }

       const value = (item.plus || 0) - (item.minus || 0);

        tagTotals[item.tag] += value;
        subtagTotals[item.tag][item.subtag] += value;

    });

    return {
        items,
        total,
        notes,
        tagTotals,
        subtagTotals
    };
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(daysBack) {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - daysBack);

    return new Date(
        past.getTime() + Math.random() * (today.getTime() - past.getTime())
    );
}


// =======================
// 🧨 BORRAR ENTRIES
// =======================
async function deleteAllEntries() {

    if (!currentUser) return;

    const confirmDelete = confirm("¿Seguro que quieres borrar TODOS los entries?");
    if (!confirmDelete) return;

    const snapshot = await getDocs(
        collection(db, "users", currentUser.uid, "entries")
    );

    for (const docSnap of snapshot.docs) {
        await deleteDoc(
            doc(db, "users", currentUser.uid, "entries", docSnap.id)
        );
    }

    alert("Entries eliminados 🧹");
}