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

    snapshot.forEach((docItem) => {
        const data = docItem.data();
        const entryId = docItem.id;

        const div = document.createElement("div");
        div.className = "entry";

        div.innerHTML = `
            <h3>Entry</h3>
            <p>${new Date(data.date.seconds * 1000).toLocaleString()}</p>

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

    } catch (error) {
        console.error(error);
    }
};