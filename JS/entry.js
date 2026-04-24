import { auth, app } from "./firebase-config.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const entryId = urlParams.get("id");
let isEdit = false;

const db = getFirestore(app);

const itemsContainer = document.getElementById("itemsContainer");
const totalAmount = document.getElementById("totalAmount");

let currentUser = null;
let tags = [];


// =======================
// AUTH
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    await loadTags(user.uid);

    if (entryId) {
        isEdit = true;
        await loadEntry(entryId);
    } else {
        addItem();
    }
});

// =======================
// LOAD TAGS
// =======================
async function loadTags(uid) {
    const snapshot = await getDocs(
        collection(db, "users", uid, "tags")
    );

    tags = [];
    snapshot.forEach(doc => tags.push(doc.data()));
}


// =======================
// ADD ITEM ROW
// =======================
function addItem() {
    const div = document.createElement("div");
    div.className = "item-row";

    const select = document.createElement("select");

    tags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag.name;
        option.textContent = tag.name;
        select.appendChild(option);
    });

    const inputPlus = document.createElement("input");
    inputPlus.type = "number";
    inputPlus.placeholder = "+";
    inputPlus.className = "green";

    const inputMinus = document.createElement("input");
    inputMinus.type = "number";
    inputMinus.placeholder = "-";
    inputMinus.className = "red";

    inputPlus.oninput = updateTotal;
    inputMinus.oninput = updateTotal;

    div.appendChild(select);
    div.appendChild(inputPlus);
    div.appendChild(inputMinus);

    itemsContainer.appendChild(div);
}


// =======================
// CALCULATE TOTAL
// =======================
function updateTotal() {
    let total = 0;

    const rows = document.querySelectorAll(".item-row");

    rows.forEach(row => {
        const plus = row.children[1].value || 0;
        const minus = row.children[2].value || 0;

        total += Number(plus) - Number(minus);
    });

    totalAmount.textContent = total;
}


// =======================
// SAVE ENTRY
// =======================
document.getElementById("btnSave").onclick = async () => {
    if (!currentUser) return;

    const rows = document.querySelectorAll(".item-row");

    const items = [];

    rows.forEach(row => {
        const tag = row.children[0].value;
        const plus = Number(row.children[1].value || 0);
        const minus = Number(row.children[2].value || 0);

        if (plus === 0 && minus === 0) return;

        items.push({ tag, plus, minus });
    });

    try {
        if (isEdit) {
            // UPDATE
            await updateDoc(
                doc(db, "users", currentUser.uid, "entries", entryId),
                {
                    items: items
                }
            );
        } else {
            // CREATE
            await addDoc(
                collection(db, "users", currentUser.uid, "entries"),
                {
                    date: new Date(),
                    items: items
                }
            );
        }

        window.location.href = "timeline.html";

    } catch (error) {
        console.error(error);
    }
};

// =======================
// LOAD ENTRY FOR EDIT
// =======================
async function loadEntry(id) {
    const docRef = doc(db, "users", currentUser.uid, "entries", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    itemsContainer.innerHTML = "";

    data.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-row";

        const select = document.createElement("select");

        tags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag.name;
            option.textContent = tag.name;

            if (tag.name === item.tag) {
                option.selected = true;
            }

            select.appendChild(option);
        });

        const inputPlus = document.createElement("input");
        inputPlus.type = "number";
        inputPlus.value = item.plus || "";
        inputPlus.placeholder = "+";
        inputPlus.className = "green";

        const inputMinus = document.createElement("input");
        inputMinus.type = "number";
        inputMinus.value = item.minus || "";
        inputMinus.placeholder = "-";
        inputMinus.className = "red";

        inputPlus.oninput = updateTotal;
        inputMinus.oninput = updateTotal;

        div.appendChild(select);
        div.appendChild(inputPlus);
        div.appendChild(inputMinus);

        itemsContainer.appendChild(div);
    });

    updateTotal();
}


// =======================
// BUTTONS
// =======================
document.getElementById("btnAddItem").onclick = addItem;

document.getElementById("btnCancel").onclick = () => {
    window.location.href = "timeline.html";
};