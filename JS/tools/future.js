
import {
    getUserEntries,
    currentUser
} from "../timeline.js";

import { getCurrencySymbol } from "../utils.js";

import { currencyFromUserGlobal } from "../timeline.js";

let currentCurrency = "...";

export async function predictFuture() {
    const entries = await getUserEntries(currentUser.uid);

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

    const baseTotal = dayPatterns[day] || 0;

    const items = generateItems(weights, baseTotal);

    const total = items.reduce((sum, it) => sum + (it.plus - it.minus), 0);

    return {
        date,
        items,
        total,
        notes: generateSmartNote(items, total, day)
    };
}

function generateItems(weights) {

    const keys = Object.keys(weights);
    const numItems = Math.floor(Math.random() * 3) + 1;

    const items = [];

    for (let i = 0; i < numItems; i++) {

        const key = keys[Math.floor(Math.random() * keys.length)];
        const [tag, subtag] = key.split(">");

        const data = weights[key];

        const totalCount = data.incomeCount + data.expenseCount;

        // 🔥 probabilidad real
        const incomeProb = totalCount === 0 ? 0 : data.incomeCount / totalCount;

        const isIncome = Math.random() < incomeProb;

        let amount = 0;

        if (isIncome) {
            const avgIncome = data.incomeCount === 0 ? 0 :
                data.incomeTotal / data.incomeCount;

            amount = Math.abs(randomize(avgIncome, 0.4));

        } else {
            const avgExpense = data.expenseCount === 0 ? 0 :
                data.expenseTotal / data.expenseCount;

            amount = Math.abs(randomize(avgExpense, 0.4));
        }

        items.push({
            tag,
            subtag,
            plus: isIncome ? amount : 0,
            minus: isIncome ? 0 : amount
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

            if (!weights[key]) {
                weights[key] = {
                    incomeCount: 0,
                    expenseCount: 0,
                    incomeTotal: 0,
                    expenseTotal: 0
                };
            }

            if (item.plus > 0) {
                weights[key].incomeCount++;
                weights[key].incomeTotal += item.plus;
            }

            if (item.minus > 0) {
                weights[key].expenseCount++;
                weights[key].expenseTotal += item.minus;
            }

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

export function cleanRender() {
    const container = document.getElementById("simulationResult");
    container.innerHTML = "";
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

                grouped[tag][subtag].forEach(item => {

                    const value = (item.plus || 0) - (item.minus || 0);
                    subTotal += value; // 🔥 ESTA LÍNEA FALTA

                     // 🔥 MOSTRAR SUBTAG (ESTO TE FALTA)
                    html += `<div class="subtag-title">↳ ${subtag}</div>`;

                    const plusText = item.plus > 0 ? `+${item.plus}` : "";
                    const minusText = item.minus > 0 ? `-${item.minus}` : "";

                    html += `
                        <div class="item-row">
                            ${item.plus > 0 ? `<span class="plus">+ ${getCurrencySymbol(currencyFromUserGlobal)} ${item.plus} ${currencyFromUserGlobal}</span>` : ""}
                            ${item.minus > 0 ? `<span class="minus">- ${getCurrencySymbol(currencyFromUserGlobal)} ${item.minus} ${currencyFromUserGlobal}</span>` : ""}
                        </div>
                    `;
                });

                groupTotal += subTotal;

                html += `
                    <div class="subtotal">
                        Subtotal: ${subTotal >= 0 ? "+ " : "- "}${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(subTotal)} ${currencyFromUserGlobal}
                    </div>
                `;
            });

                html += `
                    <div class="group-total">
                        Total: ${groupTotal >= 0 ? "+ " : "- "}${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(groupTotal)} ${currencyFromUserGlobal}
                    </div>
                `;
        });

        html += `
            <div class="notes">
                Notes: ${entry.notes || "-"}
            </div>

            <div class="final-total">
                Total = ${getCurrencySymbol(currencyFromUserGlobal)} ${entry.total} ${currencyFromUserGlobal}
            </div>
        `;

        entryDiv.innerHTML = html;
        scroll.appendChild(entryDiv);
    });
}
