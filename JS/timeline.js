import { auth, app } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const db = getFirestore(app);
const entriesContainer = document.getElementById("entriesContainer");
const timelineEl = document.getElementById("timeline");
const totalAmountEl = document.getElementById("totalAmount");

export let currentUser = null;


// =======================
// AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await loadEntries(user.uid);
    scrollToBottom(true);
});

// =======================
// LOGOUT
// =======================
document.getElementById("btnLogout").onclick = async () => {
    await signOut(auth);
    window.location.href = "/index.html";
};


// =======================
// ADD ENTRY
// =======================
document.getElementById("btnAdd").onclick = async () => {
    const user = currentUser;

    if (!user) return;

    try {

        await loadEntries(user.uid);

        window.location.href = "/HTML/entry.html";

    } catch (error) {
        console.error(error);
    }
};


// =======================
// LOAD ENTRIES
// =======================
async function loadEntries(uid) {
    entriesContainer.innerHTML = "";

    const q = query(
        collection(db, "users", uid, "entries"),
        orderBy("date", "asc") // 🔼 MÁS ANTIGUO ARRIBA
    );

const snapshot = await getDocs(q);

    const totalAmount = snapshot.docs.reduce((sum, docItem) => {
        const data = docItem.data();
        return sum + (data.total || 0);
    }, 0);

    totalAmountEl.textContent = `Total Amount: $ ${totalAmount}`;

    // COUNT NUMBER OF ENTRIES AND UPDATE USER DOC
    const entryCount = snapshot.size;
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { entryCount: entryCount }, { merge: true });

    snapshot.forEach((docItem) => {
        const data = docItem.data();
        const entryId = docItem.id;
        const entryTotal = data.total || 0;

        const div = document.createElement("div");
        div.className = "entry";

        const formattedDate = new Date(
            data.date.seconds * 1000
        );

        div.innerHTML = `

            <div class="entry-header">

                <div class="entry-main-info">
                    <p class="entry-date">
                        ${formattedDate.toLocaleDateString()}
                    </p>

                    <p class="entry-total">
                        Total: $ ${entryTotal}
                    </p>
                </div>

                <button 
                    class="expand-btn"
                    onclick="toggleEntry('${entryId}')"
                    id="btn-${entryId}"
                >
                    ▾
                </button>

            </div>

            <div class="entry-details hidden" id="details-${entryId}">

                <div class="detail-section">
                    <strong>Notes:</strong>
                    <p>${data.notes || "No notes"}</p>
                </div>

                <div class="detail-section">
                    <strong>Items:</strong>

                    ${
                        data.items.map(item => `
                            <div class="item-row">

                                <div style="display:flex; flex-direction:column; gap:6px;">

                                    <span>
                                        ${item.tag} / ${item.subtag}
                                    </span>

                                    ${
                                        item.receipt
                                        ? `
                                            <div>

                                                <p style="
                                                    margin:0 0 6px 0;
                                                    font-size:12px;
                                                    color:gray;
                                                ">
                                                    ${item.receipt.name}
                                                </p>

                                                <a 
                                                    href="${item.receipt.url}" 
                                                    target="_blank"
                                                >
                                                    <img 
                                                        src="${item.receipt.url}"
                                                        style="
                                                            width:90px;
                                                            height:90px;
                                                            object-fit:cover;
                                                            border-radius:10px;
                                                            border:1px solid #ccc;
                                                            cursor:pointer;
                                                            box-shadow:0 2px 6px rgba(0,0,0,0.15);
                                                        "
                                                    />
                                                </a>

                                            </div>
                                        `
                                        : ''
                                    }

                                </div>

                                <span>
                                    ${
                                        item.minus
                                            ? "-$" + item.minus
                                            : "+$" + item.plus
                                    }
                                </span>

                            </div>
                        `).join("")
                    }

                </div>

                <div class="entry-actions">
                    <button onclick="viewEntry('${entryId}')">
                        View / Edit
                    </button>

                    <button onclick="deleteEntry('${entryId}')">
                        Delete
                    </button>
                </div>

            </div>
        `;

        entriesContainer.appendChild(div);
    });
}

window.toggleEntry = (id) => {

    const details = document.getElementById(`details-${id}`);
    const btn = document.getElementById(`btn-${id}`);

    details.classList.toggle("hidden");

    btn.textContent =
        details.classList.contains("hidden")
            ? "▾"
            : "▴";
};

// =======================
// VIEW / EDIT
// =======================
window.viewEntry = (id) => {
    window.location.href = `/HTML/entry.html?id=${id}`;
};


// =======================
// DELETE
// =======================
window.deleteEntry = async (id) => {
    if (!confirm("Delete this entry?")) return;

    try {
        await deleteDoc(
            doc(db, "users", currentUser.uid, "entries", id)
        );

        loadEntries(currentUser.uid);
        toggleFixedBottom();

    } catch (error) {
        console.error(error);
    }
};

// =======================
// NAVIGATION
// =======================

document.getElementById("settings").onclick = async () => {
    const user = currentUser;

    if (!user) return;

    try {

        window.location.href = "/HTML/settings.html";

    } catch (error) {
        console.error(error);
    }
};


// =======================
// SCROLL TO BOTTOM
// =======================
document.getElementById("btnScrollBottom").onclick = () => {
    scrollToBottom(true);
};

const btnScroll = document.getElementById("btnScrollBottom");

window.addEventListener("scroll", () => {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10) {
        btnScroll.style.opacity = "0";
        btnScroll.style.pointerEvents = "none";
    } else {
        btnScroll.style.opacity = "1";
        btnScroll.style.pointerEvents = "auto";
    }
});

function scrollToBottom(smooth = true) {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: smooth ? "smooth" : "auto"
  });
}


const element = document.getElementById("totalAmountContainer");
function toggleFixedBottom() {
  const body = document.documentElement;
  const hasScroll = body.scrollHeight > body.clientHeight;

  if (hasScroll) {
    element.classList.add("fixed-bottom");
  } else {
    element.classList.remove("fixed-bottom");
  }
}

// =======================
// SUBMENU
// ======================
const toggleBtn = document.getElementById("btnSmartToggle");
const menu = document.getElementById("smartMenu");

toggleBtn.onclick = () => {
    menu.classList.toggle("active");

    // opcional: cambiar flechita
    toggleBtn.textContent = menu.classList.contains("active")
        ? "Smart Tools ▴"
        : "Smart Tools ▾";
};

document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
        menu.classList.remove("active");
        toggleBtn.textContent = "Smart Tools ▾";
    }
});



// Ejecutar al cargar
window.addEventListener("load", toggleFixedBottom);
// Ejecutar al cambiar tamaño
window.addEventListener("resize", toggleFixedBottom);
// Ejecutar al hacer scroll
window.addEventListener("scroll", toggleFixedBottom);

// =======================
// SMART TOOLS CODE
// =======================

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

const modalFuture = document.getElementById("modalFuture");
const modalSearch = document.getElementById("modalSearch");
const modalSpending = document.getElementById("modalSpending");
const modalComparison = document.getElementById("modalComparison");

const modalContentFuture = document.getElementById("modalContentFuture");
const modalContentSearch = document.getElementById("modalContentSearch");
const modalContentSpending = document.getElementById("modalContentSpending");
const modalContentComparison = document.getElementById("modalContentComparison");


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
// SIMULATE THE FUTURE
// =======================
function openFuture() {
    let simulationOK = verificationForSimulation(currentUser, 5);
    if (!simulationOK) return;
    openModal(1);
}

window.openFuture = openFuture;

// =======================
// SEARCH
// =======================
function openSearch() {
    let simulationOK = verificationForSimulation(currentUser, 1);
    if (!simulationOK) return;
    openModal(2);

    setupSearchInput();
    loadTagFilters();
}

window.openSearch = openSearch;

// =======================
// Spending Insights
// =======================
function openSpending() {
    let simulationOK = verificationForSimulation(currentUser, 3);
    if (!simulationOK) return;
    openModal(3);
    loadInsights();
}

window.openSpending = openSpending;

// =======================
// Insights Comparison
// =======================
function openComparison() {
    let simulationOK = verificationForSimulation(currentUser, 3);
    if (!simulationOK) return;
    openModal(4);
    loadComparison();
}

window.openComparison = openComparison;