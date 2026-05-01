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

const db = getFirestore();

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

let currentUser = null;

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

async function getUserEntries(uid) {
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

function openModal(html) {
    modalContent.innerHTML = html;
    modal.classList.remove("hidden");
}

function closeModal() {
    modal.classList.add("hidden");
}

window.closeModal = closeModal;

// cerrar al hacer click afuera
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
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
// SIMULATE THE FUTURE
// =======================
document.getElementById("btnStartFuture").onclick = () => {
    openModal(`
        <h2>Future Simulation</h2>

        <select id="simulationDuration">
            <option value="0">Today</option>
            <option value="1">1 Day</option>
            <option value="7">1 Week</option>
            <option value="30">1 Month</option>
            <option value="60">2 Months</option>
            <option value="90">3 Months</option>
            <option value="180">6 Months</option>
            <option value="365">1 Year</option>
        </select>

        <button onclick="predictFuture()">Predict</button>

        <div id="simulationResult"></div>

        <button onclick="closeModal()">Close</button>
    `);
};

async function predictFuture() {
    const entries = await getUserEntries(currentUser.uid);

    if (entries.length < 5) {
        alert("Not enough data to simulate");
        return;
    }

    const duration = parseInt(document.getElementById("simulationDuration").value);

    const usageProb = getUsageProbability(entries);
    const dayPatterns = getDayPatterns(entries);
    const weights = getCategoryWeights(entries);

    const results = [];

    const today = new Date();

    // 🔥 CASO ESPECIAL: TODAY
    if (duration === 0) {
        const forcedEntry = generateSingleEntry(today, dayPatterns, weights);
        renderSimulation([forcedEntry]);
        return;
    }

    for (let i = 0; i < duration; i++) {

        const currentDate = new Date();
        currentDate.setDate(today.getDate() + i + 1); // siempre futuro

        const day = currentDate.getDay();

        const shouldGenerate =
            (i === 0) || // 🔥 siempre el primero
            (Math.random() <= usageProb);

        if (!shouldGenerate) continue;

        const entry = generateSingleEntry(currentDate, dayPatterns, weights);
        results.push(entry);
    }

    // 🔥 SEGURIDAD EXTRA (nunca vacío)
    if (results.length === 0) {
        const fallbackDate = new Date();
        fallbackDate.setDate(today.getDate() + 1);

        results.push(
            generateSingleEntry(fallbackDate, dayPatterns, weights)
        );
    }

    renderSimulation(results);
}
window.predictFuture = predictFuture;

function analyzePatterns(entries) {

    const dayFrequency = {};
    const tagAverages = {};

    entries.forEach(entry => {
        const date = new Date(entry.date.seconds * 1000);
        const day = date.getDay();

        dayFrequency[day] = (dayFrequency[day] || 0) + 1;

        entry.items.forEach(item => {
            const key = item.tag + "_" + item.subtag;

            if (!tagAverages[key]) {
                tagAverages[key] = { total: 0, count: 0 };
            }

            tagAverages[key].total += (item.plus - item.minus);
            tagAverages[key].count++;
        });
    });

    return { dayFrequency, tagAverages, entries };
}

function generateFutureEntries(patterns, days) {

    const result = [];
    const today = new Date();

    // 🔹 Si es "Today"
    const startOffset = (days === 0) ? 0 : 1;

    const totalDays = (days === 0) ? 1 : days;

    for (let i = 0; i < totalDays; i++) {

        const date = new Date();
        date.setDate(today.getDate() + i + startOffset);

        const day = date.getDay();

        const probability = (patterns.dayFrequency[day] || 0) / patterns.entries.length;

        // 🔥 regla: siempre al menos 1 entry
        if (i !== 0 && Math.random() > probability) continue;

        const template = patterns.entries[
            Math.floor(Math.random() * patterns.entries.length)
        ];

        const newItems = template.items.map(item => {

            const key = item.tag + "_" + item.subtag;
            const avg = patterns.tagAverages[key];

            const base = avg ? avg.total / avg.count : 0;

            const variation = base * (Math.random() * 0.4 - 0.2);

            return {
                ...item,
                plus: Math.max(0, base + variation),
                minus: 0
            };
        });

        result.push({
            date,
            items: newItems,
            total: newItems.reduce((sum, i) => sum + i.plus, 0),
            notes: generateFakeNote()
        });
    }

    return result;
}

function generateSingleEntry(date, dayPatterns, weights) {
    const day = date.getDay();

    const baseTotal = dayPatterns[day] || 200;

    const items = generateItems(weights, baseTotal);

    const total = items.reduce((sum, it) => sum + (it.plus - it.minus), 0);

    return {
        date,
        items,
        total,
        notes: generateSmartNote(items, total, day)
    };
}

function generateItems(weights, baseTotal) {
    const keys = Object.keys(weights);

    const numItems = Math.floor(Math.random() * 3) + 1;

    const items = [];

    for (let i = 0; i < numItems; i++) {
        const key = keys[Math.floor(Math.random() * keys.length)];

        const [tag, subtag] = key.split(">");

        const amount = randomize(baseTotal / numItems, 0.5);

        items.push({
            tag,
            subtag,
            plus: amount,
            minus: 0
        });
    }

    return items;
}

function getUsageProbability(entries) {
    const dates = entries.map(e => e.date.toDate()).sort((a,b)=>a-b);

    const first = dates[0];
    const last = dates[dates.length - 1];

    const totalDays = Math.max(1, (last - first) / (1000*60*60*24));

    return entries.length / totalDays; // probabilidad diaria
}

function getDayPatterns(entries) {
    const map = {};

    entries.forEach(e => {
        const d = e.date.toDate().getDay(); // 0-6
        if (!map[d]) map[d] = [];

        map[d].push(e.total || 0);
    });

    const result = {};

    for (let d in map) {
        const arr = map[d];
        const avg = arr.reduce((a,b)=>a+b,0) / arr.length;

        result[d] = avg;
    }

    return result;
}

function getCategoryWeights(entries) {
    const weights = {};

    entries.forEach(e => {
        e.items.forEach(item => {
            const key = item.tag + ">" + item.subtag;

            if (!weights[key]) weights[key] = 0;
            weights[key]++;
        });
    });

    return weights;
}

function randomize(value, variance = 0.3) {
    const factor = 1 + (Math.random() * variance * 2 - variance);
    return Math.round(value * factor);
}

function generateFakeNote() {
    const notes = [
        "Normal expenses day",
        "Went out with friends",
        "Bought groceries",
        "Unexpected expense",
        "Paid bills",
        "Weekend activities"
    ];

    return notes[Math.floor(Math.random() * notes.length)];
}

function generateSmartNote(items, total, day) {
    const tags = items.map(i => i.tag);

    if (tags.includes("Food")) {
        return "Ate outside today";
    }

    if (tags.includes("Transport")) {
        return "Moved around the city";
    }

    if (total > 500) {
        return "Spent more than usual";
    }

    if (day === 5 || day === 6) {
        return "Weekend spending";
    }

    return "Normal day";
}

function renderSimulation(entries) {

    const container = document.getElementById("simulationResult");

    container.innerHTML = `
        <div class="simulation-scroll"></div>
    `;

    const scroll = container.querySelector(".simulation-scroll");

    entries.forEach(entry => {

        const entryDiv = document.createElement("div");
        entryDiv.className = "simulation-entry";

        let html = `
            <div class="entry-date">
                ${entry.date.toLocaleDateString()}
            </div>
        `;

        // 🔥 AGRUPAR POR TAG Y SUBTAG
        const grouped = {};

        entry.items.forEach(item => {
            if (!grouped[item.tag]) grouped[item.tag] = {};
            if (!grouped[item.tag][item.subtag]) grouped[item.tag][item.subtag] = [];

            grouped[item.tag][item.subtag].push(item);
        });

        // 🔹 RECORRER GROUPS
        Object.keys(grouped).forEach(tag => {

            let groupTotal = 0;

            html += `<div class="group-title">${tag}</div>`;

            Object.keys(grouped[tag]).forEach(subtag => {

                let subTotal = 0;

                html += `<div class="subtag-title">${subtag}</div>`;

                grouped[tag][subtag].forEach(item => {

                    const value = (item.plus || 0) - (item.minus || 0);
                    subTotal += value;

                    html += `
                        <div class="item-row">
                            <span class="plus">+${item.plus || 0}</span>
                            <span class="minus">-${item.minus || 0}</span>
                        </div>
                    `;
                });

                groupTotal += subTotal;

                html += `
                    <div class="subtotal">
                        SubTotal = ${subTotal}
                    </div>
                `;
            });

            html += `
                <div class="group-total">
                    SubTotal Group = ${groupTotal}
                </div>
            `;
        });

        html += `
            <div class="notes">
                Notes: ${entry.notes || "-"}
            </div>

            <div class="final-total">
                Total = ${entry.total}
            </div>
        `;

        entryDiv.innerHTML = html;
        scroll.appendChild(entryDiv);
    });
}



// =======================
// SEARCH
// =======================
document.getElementById("btnStartSearch").onclick = () => {
    openModal(`
        <h2>Search Entries</h2>

        <input type="text" id="searchInput" placeholder="Keyword...">
        <button id="runSearch">Search</button>

        <div id="searchResults"></div>

        <button onclick="closeModal()">Close</button>
    `);
};

















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
        ["Food", "Restaurant", rand(200, 500)],
        ["Food", "Groceries", rand(150, 350)],
        ["Transport", "Taxi", rand(80, 250)],
        ["Entertainment", "Movies", rand(120, 300)],
        ["Entertainment", "Shopping", rand(400, 1200)],
        ["Entertainment", "Makeup", rand(200, 800)],
        ["Transport", "Uber", rand(100, 300)],
        ["Food", "Coffee", rand(60, 150)]
    ];

    const items = pickRandomItems(possibleItems, isWeekend ? 4 : 2);

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
        ["Food", "Groceries", rand(80, 180)],
        ["Food", "Restaurant", rand(90, 200)],
        ["Transport", "Bus", rand(20, 60)],
        ["Entertainment", "Games", rand(50, 300)],
        ["Entertainment", "Streaming", rand(50, 150)],
        ["Food", "Snacks", rand(40, 120)],
        ["Food", "Delivery", rand(100, 250)],
        ["Transport", "Uber", rand(80, 200)]
    ];

    const items = pickRandomItems(possibleItems, isWeekend ? 3 : 2);

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
        ["Food", "Groceries", rand(120, 300)],
        ["Food", "Restaurant", rand(100, 250)],
        ["Transport", "Bus", rand(20, 50)],
        ["Entertainment", "Movies", rand(80, 180)],
        ["Education", "Books", rand(150, 400)],
        ["Health", "Pharmacy", rand(80, 200)],
        ["Food", "Coffee", rand(50, 120)],
        ["Transport", "Uber", rand(80, 200)]
    ];

    const items = pickRandomItems(possibleItems, isWeekend ? 3 : 2);

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
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(i => createItem(i[0], i[1], i[2]));
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function createItem(tag, subtag, plus) {
    return {
        tag,
        subtag,
        plus,
        minus: 0,
        receipt: null
    };
}

function buildEntry(items, notes) {

    let total = 0;
    const tagTotals = {};
    const subtagTotals = {};

    items.forEach(item => {
        total += item.plus;

        if (!tagTotals[item.tag]) tagTotals[item.tag] = 0;
        if (!subtagTotals[item.tag]) subtagTotals[item.tag] = {};

        if (!subtagTotals[item.tag][item.subtag]) {
            subtagTotals[item.tag][item.subtag] = 0;
        }

        tagTotals[item.tag] += item.plus;
        subtagTotals[item.tag][item.subtag] += item.plus;
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