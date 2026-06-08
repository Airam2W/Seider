import {
    getUserEntries,
    currentUser
} from "../timeline.js";

import { getCurrencySymbol } from "../utils.js";

import { currencyFromUserGlobal } from "../timeline.js";

import {
    initI18n,
    t,
    translateStoredLabel
} from "../i18n.js";

await initI18n();

let currentCurrency = "...";

export async function predictFuture() {
    const entries = await getUserEntries(currentUser.uid);

    const duration = parseInt(document.getElementById("simulationDuration").value);

    const usageProb = getUsageProbability(entries);
    const dayPatterns = getDayPatterns(entries);
    const weights = getCategoryWeights(entries);

    const results = [];
    const today = new Date();

    if (duration === 0) {
        const forcedEntry = generateSingleEntry(today, dayPatterns, weights);
        renderSimulation([forcedEntry]);
        return;
    }

    for (let i = 0; i < duration; i++) {
        const currentDate = new Date();
        currentDate.setDate(today.getDate() + i + 1);

        const shouldGenerate = (i === 0) || (Math.random() <= usageProb);

        if (!shouldGenerate) continue;

        const entry = generateSingleEntry(currentDate, dayPatterns, weights);
        results.push(entry);
    }

    if (results.length === 0) {
        const fallbackDate = new Date();
        fallbackDate.setDate(today.getDate() + 1);
        results.push(generateSingleEntry(fallbackDate, dayPatterns, weights));
    }

    renderSimulation(results);
}

window.predictFuture = predictFuture;

function analyzePatterns(entries) {
    const dayFrequency = {};
    const tagAverages = {};

    entries.forEach((entry) => {
        const date = new Date(entry.date.seconds * 1000);
        const day = date.getDay();

        dayFrequency[day] = (dayFrequency[day] || 0) + 1;

        entry.items.forEach((item) => {
            const key = `${item.tag}_${item.subtag}`;

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
    const startOffset = days === 0 ? 0 : 1;
    const totalDays = days === 0 ? 1 : days;

    for (let i = 0; i < totalDays; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i + startOffset);

        const day = date.getDay();
        const probability = (patterns.dayFrequency[day] || 0) / patterns.entries.length;

        if (i !== 0 && Math.random() > probability) continue;

        const template = patterns.entries[Math.floor(Math.random() * patterns.entries.length)];

        const newItems = template.items.map((item) => {
            const key = `${item.tag}_${item.subtag}`;
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
            total: newItems.reduce((sum, item) => sum + item.plus, 0),
            notes: generateFakeNote()
        });
    }

    return result;
}

function generateSingleEntry(date, dayPatterns, weights) {
    const day = date.getDay();
    const baseTotal = dayPatterns[day] || 0;
    const items = generateItems(weights, baseTotal);
    const total = items.reduce((sum, item) => sum + (item.plus - item.minus), 0);

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
        const incomeProb = totalCount === 0 ? 0 : data.incomeCount / totalCount;
        const isIncome = Math.random() < incomeProb;

        let amount = 0;

        if (isIncome) {
            const avgIncome = data.incomeCount === 0 ? 0 : data.incomeTotal / data.incomeCount;
            amount = Math.abs(randomize(avgIncome, 0.4));
        } else {
            const avgExpense = data.expenseCount === 0 ? 0 : data.expenseTotal / data.expenseCount;
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
    const dates = entries.map((entry) => entry.date.toDate()).sort((a, b) => a - b);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const totalDays = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));

    return entries.length / totalDays;
}

function getDayPatterns(entries) {
    const map = {};

    entries.forEach((entry) => {
        const day = entry.date.toDate().getDay();
        if (!map[day]) map[day] = [];

        map[day].push(entry.total || 0);
    });

    const result = {};

    for (const day in map) {
        const arr = map[day];
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        result[day] = avg;
    }

    return result;
}

function getCategoryWeights(entries) {
    const weights = {};

    entries.forEach((entry) => {
        entry.items.forEach((item) => {
            const key = `${item.tag}>${item.subtag}`;

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
        t("future.normalExpensesDay"),
        t("future.wentOutWithFriends"),
        t("future.boughtGroceries"),
        t("future.unexpectedExpense"),
        t("future.paidBills"),
        t("future.weekendActivities")
    ];

    return notes[Math.floor(Math.random() * notes.length)];
}

function generateSmartNote(items, total, day) {
    const tags = items.map((item) => item.tag);

    if (tags.includes("Food")) {
        return t("future.ateOutsideToday");
    }

    if (tags.includes("Transport")) {
        return t("future.movedAroundTheCity");
    }

    if (total > 500) {
        return t("future.spentMoreThanUsual");
    }

    if (day === 5 || day === 6) {
        return t("future.weekendSpending");
    }

    return t("future.normalDay");
}

export function cleanRender() {
    const container = document.getElementById("simulationResult");
    container.innerHTML=`<div class="future-empty">

                        <div class="future-empty-icon">
                            ✦
                        </div>

                        <h3 data-i18n="timeline.noPrediction">
                            ${t("timeline.noPrediction")}
                        </h3>

                        <p data-i18n="timeline.selectSimulationPeriod">
                            ${t("timeline.selectSimulationPeriod")}
                        </p>

                    </div>`;

}

function renderSimulation(entries) {
    const container = document.getElementById("simulationResult");

    container.innerHTML = `<div class="simulation-scroll"></div>`;

    const scroll = container.querySelector(".simulation-scroll");

    entries.forEach((entry) => {
        const entryDiv = document.createElement("div");
        entryDiv.className = "simulation-entry";

        let html = `
            <div class="simulation-date">
                ${t("labels.date")} ${entry.date.toLocaleDateString()}
            </div>
        `;

        const grouped = {};

        entry.items.forEach((item) => {
            if (!grouped[item.tag]) grouped[item.tag] = {};
            if (!grouped[item.tag][item.subtag]) grouped[item.tag][item.subtag] = [];

            grouped[item.tag][item.subtag].push(item);
        });

        Object.keys(grouped).forEach((tag) => {
            let groupTotal = 0;
            html += `<div class="future-group">`;
            html += `<div class="future-group-title">${translateStoredLabel(tag)}</div>`;

            Object.keys(grouped[tag]).forEach((subtag) => {
                let subTotal = 0;

                grouped[tag][subtag].forEach((item) => {
                    const value = (item.plus || 0) - (item.minus || 0);
                    subTotal += value;

                    html += `<div class="future-subtag">${translateStoredLabel(subtag)}</div>`;

                    html += `
                        <div class="future-item">
                            ${item.plus > 0 ? `<span class="future-plus">+ ${getCurrencySymbol(currencyFromUserGlobal)} ${item.plus} ${currencyFromUserGlobal}</span>` : ""}
                            ${item.minus > 0 ? `<span class="future-minus">- ${getCurrencySymbol(currencyFromUserGlobal)} ${item.minus} ${currencyFromUserGlobal}</span>` : ""}
                        </div>
                    `;
                });

                groupTotal += subTotal;

                html += `
                    <div class="future-subtotal">
                        ${t("future.subtotal")}:
                        ${subTotal >= 0 ? "+ " : "- "}
                        ${getCurrencySymbol(currencyFromUserGlobal)}
                        ${Math.abs(subTotal)}
                        ${currencyFromUserGlobal}
                    </div>
                `;
            });

            html += `
                <div class="future-total">
                    ${t("future.total")}:
                    ${groupTotal >= 0 ? "+ " : "- "}
                    ${getCurrencySymbol(currencyFromUserGlobal)}
                    ${Math.abs(groupTotal)}
                    ${currencyFromUserGlobal}
                </div>
            `;
        });

        html += `
            <div class="future-notes">
                ${t("labels.notes")} ${entry.notes || "-"}
            </div>

            <div class="future-final-total">
                ${t("future.totalEquals")}
                ${getCurrencySymbol(currencyFromUserGlobal)}
                ${entry.total}
                ${currencyFromUserGlobal}
            </div>
        `;

        entryDiv.innerHTML = html;
        scroll.appendChild(entryDiv);
    });
}
