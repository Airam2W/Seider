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
    doc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const db = getFirestore(app);
const entriesContainer = document.getElementById("entriesContainer");
const timelineEl = document.getElementById("timeline");
const totalAmountEl = document.getElementById("totalAmount");

let currentUser = null;


// =======================
// AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await loadEntries(user.uid);
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

    const snapshot = await getDocs(
        collection(db, "users", uid, "entries")
    );

    const totalAmount = snapshot.docs.reduce((sum, docItem) => {
        const data = docItem.data();
        return sum + (data.total || 0);
    }, 0);

    totalAmountEl.textContent = `Total Amount: ${totalAmount}`;

    snapshot.forEach((docItem) => {
        const data = docItem.data();
        const entryId = docItem.id;
        const entryTotal = data.total || 0;

        const div = document.createElement("div");
        div.className = "entry";

        div.innerHTML = `
            <p>${new Date(data.date.seconds * 1000).toLocaleString()}</p>
            <p>Total: ${entryTotal}</p>

            <button onclick="viewEntry('${entryId}')">View / Edit</button>
            <button onclick="deleteEntry('${entryId}')">Delete</button>
        `;

        entriesContainer.appendChild(div);
    });
}

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
// SCROLL TO BOTTOM
// =======================
document.getElementById("btnScrollBottom").onclick = () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth"
  });
};


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

// Ejecutar al cargar
window.addEventListener("load", toggleFixedBottom);
// Ejecutar al cambiar tamaño
window.addEventListener("resize", toggleFixedBottom);
// Ejecutar al hacer scroll
window.addEventListener("scroll", toggleFixedBottom);