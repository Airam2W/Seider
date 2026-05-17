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

let tagChart = null;
let historyChart = null;


export async function loadComparison() {

    const entries = await getUserEntries(currentUser.uid);

    const typeSelect = document.getElementById("compareType");

    function refresh() {

        const type = typeSelect.value;

        const { current, previous } = splitPeriods(entries, type);

        const grouped = buildGrouped(entries, type);

        // ✅ SUMMARY
        document.getElementById("comparisonSummary").innerHTML =
            getComparisonSummary(current, previous);

        // ✅ WHY (usa grouped)
        document.getElementById("comparisonWhy").innerHTML =
            getWhyChanged(grouped);

        // ✅ TAG HISTORY
        renderTagHistory(grouped);

        // ✅ SUBTAG HISTORY
        updateSubtagComparison(entries);

        // ✅ HISTORY
        renderMonthlyHistory(entries);

        // ✅ TREND
        document.getElementById("trendPrediction").innerHTML =
            getTrendPrediction(grouped);
    }

    typeSelect.onchange = refresh;

    refresh();
}

window.loadComparison = loadComparison;

//
// =======================
// PERIOD SPLIT
// =======================
//
function splitPeriods(entries, type) {

    const now = new Date();

    let currentStart, previousStart;

    if (type === "month") {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    if (type === "week") {
        const day = now.getDay();

        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - day);

        previousStart = new Date(currentStart);
        previousStart.setDate(currentStart.getDate() - 7);
    }

    if (type === "year") {
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
    }

    const current = [];
    const previous = [];

    entries.forEach(e => {
        const d = e.date.toDate();

        if (d >= currentStart) current.push(e);
        else if (d >= previousStart) previous.push(e);
    });

    return { current, previous };
}

//
// =======================
// SUMMARY
// =======================
//
function getComparisonSummary(current, previous) {

    const sumCurrent = sumEntries(current);
    const sumPrevious = sumEntries(previous);

    const diff = sumCurrent - sumPrevious;

    const absDiff = Math.abs(diff);

    let message = "";
    let detail = "";

    let diffSimbol = "+";
    if (diff < 0) diffSimbol = "-";

    // JUST SPENDING
    if (sumCurrent <= 0 && sumPrevious <= 0) {

        if (Math.abs(sumCurrent) > Math.abs(sumPrevious)) {
            message = t("analytics.spentMore");
            detail = `${t("analytics.increaseInSpending")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(absDiff).toFixed(2)} ${currencyFromUserGlobal}`;
        } else {
            message = t("analytics.spentLess");
            detail = `${t("analytics.reductionInSpending")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(absDiff).toFixed(2)} ${currencyFromUserGlobal}`;
        }

    }
    // JUST INCOME
    else if (sumCurrent >= 0 && sumPrevious >= 0) {

        if (sumCurrent > sumPrevious) {
            message = t("analytics.incomeIncreased");
            detail = `${t("analytics.incomeGrowth")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(absDiff).toFixed(2)} ${currencyFromUserGlobal}`;
        } else {
            message = t("analytics.incomeDecreased");
            detail = `${t("analytics.incomeDrop")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(absDiff).toFixed(2)} ${currencyFromUserGlobal}`;
        }

    }
    // MIXED
    else {
        message = t("analytics.changedSignificantly");
        detail = `${t("analytics.netChange")}: ${diffSimbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(diff).toFixed(2)} ${currencyFromUserGlobal}`;
    }

    let sumPrevSimbol = "+";
    if (sumPrevious < 0) sumPrevSimbol = "-";

    let sumCurrSimbol = "+";
    if (sumCurrent < 0) sumCurrSimbol = "-";

    return `
        <p>
        ${t("analytics.previous")}: <b>${sumPrevSimbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(sumPrevious).toFixed(2)} ${currencyFromUserGlobal}</b><br>
        ${t("analytics.current")}: <b>${sumCurrSimbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(sumCurrent).toFixed(2)} ${currencyFromUserGlobal}</b>
        </p>

        <p><b>${message}</b></p>
        <p>${detail}</p>
    `;
}

function sumEntries(entries) {
    return entries.reduce((total, e) => {
        const entryTotal = e.items.reduce((sum, i) => {
            const val = (i.plus || 0) - (i.minus || 0);
            return sum + val;
        }
        , 0);
        return total + entryTotal;
    }, 0);
}

function formatMoney(val) {
    return `${val >= 0 ? "+" : ""}${val}`;
}

function getTrend(diff) {
    if (diff > 0) return "📈 Increasing";
    if (diff < 0) return "📉 Decreasing";
    return "➖ Stable";
}

function buildGrouped(entries, period) {
    const grouped = {};

    entries.forEach(e => {
        const d = e.date.toDate();
        const key = getPeriodKey(d, period);

        if (!grouped[key]) grouped[key] = {};

        e.items.forEach(i => {
            const val = (i.plus || 0) - (i.minus || 0);

            if (!grouped[key][i.tag]) grouped[key][i.tag] = 0;
            grouped[key][i.tag] += val;
        });
    });

    return grouped;
}

//
// =======================
// WHY 
// =======================
//
function getWhyChanged(grouped) {

    const periods = Object.keys(grouped).sort();

    if (periods.length < 2) return t("status.notEnoughData");

    const first = grouped[periods[0]];
    const last = grouped[periods[periods.length - 1]];

    const changes = [];

    const allTags = new Set([
        ...Object.keys(first),
        ...Object.keys(last)
    ]);

    allTags.forEach(tag => {
        const diff = (last[tag] || 0) - (first[tag] || 0);
        changes.push({ tag, diff });
    });

    changes.sort((a,b)=>Math.abs(b.diff) - Math.abs(a.diff));

    const top3 = changes.slice(0,3);

    let diffSimbol = "+";
    if (top3[0].diff < 0) diffSimbol = "-";

    return `
        ${top3.map(c => {

            const type = c.diff < 0 
                ? t("analytics.higherSpending") 
                : t("analytics.lowerSpending");

            return `
                <p>
                <b>${c.tag}</b>: ${type} 
                ( ${diffSimbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(c.diff).toFixed(2)} ${currencyFromUserGlobal})
                </p>
            `;
        }).join("")}

        <p>${t("analytics.strongestImpact")}</p>
    `;
}

//
// =======================
// TAG COMPARISON
// =======================
//
function renderTagComparison(current, previous) {

    const ctx = document.getElementById("tagCompareChart");

    if (tagChart) tagChart.destroy();

    const mapA = groupByTag(current);
    const mapB = groupByTag(previous);

    const tags = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])];

    tagChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: tags,
            datasets: [
                {
                    label: t("analytics.current"),
                    data: tags.map(t => mapA[t] || 0)
                },
                {
                    label: t("analytics.previous"),
                    data: tags.map(t => mapB[t] || 0)
                }
            ]
        }
    });
}

function renderTagHistory(grouped) {

    const ctx = document.getElementById("tagCompareChart");

    if (tagChart) tagChart.destroy();

    const labels = Object.keys(grouped).sort();

    const allTags = new Set();

    Object.values(grouped).forEach(p => {
        Object.keys(p).forEach(t => allTags.add(t));
    });

    const datasets = [];

    allTags.forEach(tag => {
        datasets.push({
            label: translateStoredLabel(tag),
            data: labels.map(l => grouped[l][tag] || 0),
            borderWidth: 2,
            fill: false
        });
    });

    tagChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets }
    });
}

function groupByTag(entries) {
    const map = {};

    entries.forEach(e => {
        e.items.forEach(i => {
            const val = (i.plus || 0) - (i.minus || 0);

            if (!map[i.tag]) map[i.tag] = 0;
            map[i.tag] += val;
        });
    });

    return map;
}

function updateSubtagComparison(entries) {

    const period = document.getElementById("compareType").value;

    const grouped = {};

    entries.forEach(e => {
        const date = e.date.toDate();
        const key = getPeriodKey(date, period);

        if (!grouped[key]) grouped[key] = {};

        e.items.forEach(i => {
            const val = (i.plus || 0) - (i.minus || 0);

            if (!grouped[key][i.subtag]) grouped[key][i.subtag] = 0;
            grouped[key][i.subtag] += val;
        });
    });

    const labels = Object.keys(grouped).sort();

    const allSubtags = new Set();

    Object.values(grouped).forEach(periodData => {
        Object.keys(periodData).forEach(s => allSubtags.add(s));
    });

    const datasets = [];

    allSubtags.forEach(sub => {
        datasets.push({
            label: translateStoredLabel(sub),
            data: labels.map(l => grouped[l][sub] || 0),
            borderWidth: 2,
            fill: false
        });
    });

    renderMultiLineChart("subtagCompareChart", labels, datasets);
}

let subtagChart = null;

function renderMultiLineChart(canvasId, labels, datasets) {

    const ctx = document.getElementById(canvasId);

    if (subtagChart) subtagChart.destroy();

    subtagChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: translateStoredLabel(labels),
            datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

//
// =======================
// MONTHLY HISTORY
// =======================
//
function renderMonthlyHistory(entries) {

    const ctx = document.getElementById("historyChart");

    if (historyChart) historyChart.destroy();

    const map = {};

    entries.forEach(e => {
        const d = e.date.toDate();
        const key = `${d.getFullYear()}-${d.getMonth()+1}`;

        if (!map[key]) map[key] = 0;
        map[key] += e.total || 0;
    });

    const labels = Object.keys(map).sort();
    const data = labels.map(l => map[l]);

    historyChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: t("analytics.monthlyTotal"),
                data
            }]
        }
    });
}

function getPeriodKey(date, type) {
    if (type === "month") {
        return `${date.getFullYear()}-${date.getMonth()+1}`;
    }

    if (type === "week") {
        const first = new Date(date);
        first.setDate(date.getDate() - date.getDay());
        return first.toISOString().split("T")[0];
    }

    if (type === "year") {
        return `${date.getFullYear()}`;
    }
}

//
// =======================
// TREND PREDICTION
// =======================
//
function renderTrendPrediction(entries) {

    const container = document.getElementById("trendPrediction");

    const values = entries
        .sort((a,b)=>a.date.seconds - b.date.seconds)
        .map(e => e.total || 0);

    if (values.length < 2) {
        container.innerHTML = t("status.notEnoughData");
        return;
    }

    const first = values[0];
    const last = values[values.length - 1];

    let trend = "";

    if (last > first * 1.1) trend = t("analytics.trendIncreasingOverTime");
    else if (last < first * 0.9) trend = t("analytics.trendDecreasingOverTime");
    else trend = t("analytics.trendStableOverTime");

    container.innerHTML = `<p>${trend}</p>`;
}

function getTrendPrediction(grouped) {

    const periods = Object.keys(grouped).sort();

    if (periods.length < 3) {
        return t("status.notEnoughDataToPredict");
    }

    const totals = periods.map(p => sumValues(grouped[p]));

    const last = totals[totals.length - 1];
    const prev = totals[totals.length - 2];

    const diff = last - prev;
    const absDiff = Math.abs(diff);

    let message = "";

    if (last <= 0 && prev <= 0) {

        if (Math.abs(last) > Math.abs(prev)) {
            message = t("analytics.spendingIncreasing", {
                value: `${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(absDiff).toFixed(2)} ${currencyFromUserGlobal}`
            });
        } else {
            message = t("analytics.spendingDecreasing");
        }

    } else {
        message = t("analytics.financialPatternChanging");
    }

    return `
        <p>${message}</p>
    `;
}

function sumValues(obj) {
    return Object.values(obj).reduce((a,b)=>a+b,0);
}