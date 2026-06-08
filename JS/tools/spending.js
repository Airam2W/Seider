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


const timeSelect = document.getElementById("timeRange");
timeSelect.selectedIndex = timeSelect.querySelectorAll("option").length - 1;

export async function loadInsights() {

    const allEntries = await getUserEntries(currentUser.uid);


    const tagSelect = document.getElementById("tagSelect");
    const subtagSelect = document.getElementById("subtagSelect");

    // DEFAULTS
    timeSelect.value = "all";


    function refreshAll() {

        const filtered = filterByRange(allEntries, timeSelect.value);

        loadTagSelector(filtered);

        if (!tagSelect.value) tagSelect.value = "ALL";

        updateTagChart(filtered);

        document.getElementById("generalAnalysis").innerHTML =
            getGeneralAnalysis(filtered);
    }

    timeSelect.onchange = refreshAll;

    refreshAll();
}

window.loadInsights = loadInsights;


function filterByRange(entries, days) {
    if (days === "all") return entries;

    const now = new Date();

    return entries.filter(e => {
        const d = e.date.toDate();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= days;
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

function renderPie(data) {
    const ctx = document.getElementById("pieChart");

    new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data)
            }]
        }
    });
}

function getTrend(entries) {
    if (entries.length < 2) return t("status.notEnoughData");

    const sorted = [...entries].sort((a, b) => a.date.seconds - b.date.seconds);

    const first = sorted[0].total;
    const last = sorted[sorted.length - 1].total;

    if (last > first * 1.1) return t("status.upwardTrend");
    if (last < first * 0.9) return t("status.downwardTrend");

    return t("status.stableTrend");
}



function generateStats(entries) {

    const totals = entries.map(e => e.total || 0);

    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;

    const max = Math.max(...totals);
    const min = Math.min(...totals);

    return `
        <p>${t("analytics.average")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${avg.toFixed(2)} ${currencyFromUserGlobal}</p>
        <p>${t("analytics.max")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${max} ${currencyFromUserGlobal}</p>
        <p>${t("analytics.min")}: ${getCurrencySymbol(currencyFromUserGlobal)} ${min} ${currencyFromUserGlobal}</p>
        <p>${t("analytics.trend")}: ${getTrend(entries)}</p>
    `;
}

function buildTimeSeries(entries, filterFn) {
    const map = {};

    entries.forEach(e => {
        const dateObj = e.date.toDate();
        const key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD

        if (!map[key]) map[key] = 0;

        e.items.forEach(i => {
            if (filterFn(i)) {
                map[key] += (i.plus || 0) - (i.minus || 0);
            }
        });
    });

    const sortedDates = Object.keys(map).sort();

    return {
        labels: sortedDates,
        data: sortedDates.map(d => map[d])
    };
}

let tagChartInstance = null;

function renderTagChart(labels, data) {

    const ctx = document.getElementById("tagLineChart");

    if (tagChartInstance) tagChartInstance.destroy();

    tagChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Amount",
                data
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function loadTagSelector(entries) {
    const select = document.getElementById("tagSelect");

    const tags = new Set();

    entries.forEach(e => {
        e.items.forEach(i => tags.add(i.tag));
    });

    select.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "ALL";
    allOpt.textContent = t("analytics.allTags");
    select.appendChild(allOpt);

    tags.forEach(tag => {
        const opt = document.createElement("option");
        opt.value = tag;
        opt.textContent = translateStoredLabel(tag);
        select.appendChild(opt);
    });

    select.value = "ALL";

    select.onchange = () => updateTagChart(entries);
}

function updateTagChart(entries) {
    const tagSelect = document.getElementById("tagSelect");
    const subtagSelect = document.getElementById("subtagSelect");

    const tag = tagSelect.value || "ALL";

    // ALWAYS UPDATE SUBTAG SELECTOR
    loadSubtagSelector(entries, tag);

    // DEFAULT SUBTAG
    if (!subtagSelect.value) {
        subtagSelect.value = "ALL";
    }

    // =========================
    // TAG CHART
    // =========================
    if (tag === "ALL") {

        const tags = [...new Set(
            entries.flatMap(e => e.items.map(i => i.tag))
        )];

        const datasets = tags.map(t => {
            const series = buildTimeSeries(entries, i => i.tag === t);

            return {
                label: translateStoredLabel(t),
                data: series.data,
                borderWidth: 2,
                fill: false
            };
        });

        const labels = buildTimeSeries(entries, () => true).labels;

        renderMultiLineChart("tagLineChart", labels, datasets);

    } else {

        const series = buildTimeSeries(entries, i => i.tag === tag);
        renderTagChart(series.labels, series.data);
    }

    updateSubtagChart(entries, tag);
}

function loadSubtagSelector(entries, tag) {
    const select = document.getElementById("subtagSelect");

    const subs = new Set();

    entries.forEach(e => {
        e.items.forEach(i => {
            if (tag === "ALL" || i.tag === tag) {
                subs.add(i.subtag);
            }
        });
    });

    select.innerHTML = "";

    const allOpt = document.createElement("option");
    allOpt.value = "ALL";
    allOpt.textContent = t("analytics.allSubtags");
    select.appendChild(allOpt);

    subs.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = translateStoredLabel(sub);
        select.appendChild(opt);
    });

    // DEFAULT
    select.value = "ALL";

    select.onchange = () => updateSubtagChart(entries, tag);
}

let subChartInstance = null;

function updateSubtagChart(entries, tag) {
    const sub = document.getElementById("subtagSelect").value;
    const ctx = document.getElementById("subtagLineChart");

    if (subChartInstance) subChartInstance.destroy();

    // ALL TAGS + ALL SUBTAGS
    if (tag === "ALL" && sub === "ALL") {

        const subs = [...new Set(
            entries.flatMap(e => e.items.map(i => i.subtag))
        )];

        const datasets = [];

        subs.forEach(s => {
            const series = buildTimeSeries(entries, i => i.subtag === s);

            datasets.push({
                label: translateStoredLabel(s),
                data: series.data,
                borderWidth: 2,
                fill: false
            });
        });

        const labels = buildTimeSeries(entries, () => true).labels;

        subChartInstance = new Chart(ctx, {
            type: "line",
            data: { labels, datasets },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });

        return;
    }

    // ALL SUBTAGS of TAG
    if (sub === "ALL") {

        const subs = [...new Set(
            entries
                .flatMap(e => e.items)
                .filter(i => tag === "ALL" || i.tag === tag)
                .map(i => i.subtag)
        )];

        const datasets = [];

        subs.forEach(s => {
            const series = buildTimeSeries(entries, i =>
                (tag === "ALL" || i.tag === tag) && i.subtag === s
            );

            datasets.push({
                label: translateStoredLabel(s),
                data: series.data,
                borderWidth: 2,
                fill: false
            });
        });

        const labels = buildTimeSeries(entries, i =>
            tag === "ALL" || i.tag === tag
        ).labels;

        subChartInstance = new Chart(ctx, {
            type: "line",
            data: { labels, datasets },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });

        return;
    }

    // NORMAL
    const series = buildTimeSeries(entries, i =>
        (tag === "ALL" || i.tag === tag) && i.subtag === sub
    );

    subChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: translateStoredLabel(series.labels),
            datasets: [{
                label: translateStoredLabel(sub),
                data: series.data
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

function renderMultiLineChart(canvasId, labels, datasets) {

    const ctx = document.getElementById(canvasId);

    if (tagChartInstance) tagChartInstance.destroy();

    tagChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}



function getGeneralAnalysis(entries) {

    if (!entries.length) {
        return `<p>${t("status.noDataAvailable")}</p>`;
    }

    let total = 0;
    let income = 0;
    let expense = 0;

    const tagStats = {};
    const subStats = {};

    entries.forEach(e => {
        total += e.total || 0;

        e.items.forEach(i => {
            const val = (i.plus || 0) - (i.minus || 0);

            if (val >= 0) income += val;
            else expense += val;

            // TAG
            if (!tagStats[i.tag]) tagStats[i.tag] = 0;
            tagStats[i.tag] += val;

            // SUBTAG
            const key = i.tag + " > " + i.subtag;
            if (!subStats[key]) subStats[key] = 0;
            subStats[key] += val;
        });
    });

    const avg = total / entries.length;

    const bestDay = entries.reduce((a, b) => a.total > b.total ? a : b);
    const worstDay = entries.reduce((a, b) => a.total < b.total ? a : b);

    const maxTag = Object.entries(tagStats).sort((a, b) => b[1] - a[1])[0];
    const minTag = Object.entries(tagStats).sort((a, b) => a[1] - b[1])[0];

    const maxSub = Object.entries(subStats).sort((a, b) => b[1] - a[1])[0];
    const minSub = Object.entries(subStats).sort((a, b) => a[1] - b[1])[0];

    let totalNetSymbol = "+"
    if (total < 0) {
        totalNetSymbol = "-";
    }

    let averageSymbol = "+";
    if (avg < 0) {
        averageSymbol = "-";
    }

    let maxTagSymbol = "+";
    if (maxTag?.[1] < 0) {
        maxTagSymbol = "-";
    }

    let minTagSymbol = "+";
    if (minTag?.[1] < 0) {
        minTagSymbol = "-";
    }

    let maxSubSymbol = "+";
    if (maxSub?.[1] < 0) {
        maxSubSymbol = "-";
    }

    let minSubSymbol = "+";
    if (minSub?.[1] < 0) {
        minSubSymbol = "-";
    }

    return `
        <div class="insight-box">

            <br>
            <p><strong>💰 ${t("analytics.totalNet")}</strong> ${totalNetSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(total).toFixed(2)} ${currencyFromUserGlobal}</p>
            <p><strong>📈 ${t("analytics.income")}</strong> + ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(income).toFixed(2)} ${currencyFromUserGlobal}</p>
            <p><strong>📉 ${t("analytics.expenses")}</strong> - ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(expense).toFixed(2)} ${currencyFromUserGlobal}</p>

            <br>
            <hr>

            <br>
            <p><strong>📊 ${t("analytics.averagePerEntry")}</strong> ${averageSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(avg).toFixed(2)} ${currencyFromUserGlobal}</p>

            <p><strong>🏆 ${t("analytics.bestDay")}</strong> ${bestDay.date.toDate().toLocaleDateString()} ( + ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(bestDay.total).toFixed(2)} ${currencyFromUserGlobal})</p>
            <p><strong>⚠️ ${t("analytics.worstDay")}</strong> ${worstDay.date.toDate().toLocaleDateString()} ( - ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(worstDay.total).toFixed(2)} ${currencyFromUserGlobal})</p>

            <br>
            <hr>

            <br>
            <p><strong>🥇 ${t("analytics.topPerformingTag")}</strong> ${translateStoredLabel(maxTag?.[0] || "")} ( ${maxTagSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(maxTag?.[1]).toFixed(2)} ${currencyFromUserGlobal})</p>
            <p><strong>💸 ${t("analytics.mostCostlyTag")}</strong> ${translateStoredLabel(minTag?.[0] || "")} ( ${minTagSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(minTag?.[1]).toFixed(2)} ${currencyFromUserGlobal})</p>

            <p><strong>🥇 ${t("analytics.topSubcategory")}</strong> ${translateStoredLabel(maxSub?.[0] || "")} ( ${maxSubSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(maxSub?.[1]).toFixed(2)} ${currencyFromUserGlobal})</p>
            <p><strong>💸 ${t("analytics.mostCostlySubcategory")}</strong> ${translateStoredLabel(minSub?.[0] || "")} ( ${minSubSymbol} ${getCurrencySymbol(currencyFromUserGlobal)} ${Math.abs(minSub?.[1]).toFixed(2)} ${currencyFromUserGlobal})</p>

            <br>
            <hr>

            <br>
            <p><strong>📊 ${t("analytics.trend")}</strong> ${getTrend(entries)}</p>

        </div>
    `;
}

