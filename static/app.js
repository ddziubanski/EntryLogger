let staffList = [];
let reasons = [];
let currentHistory = [];
let selectedStaffId = null;
let currentAction = null;
let currentReason = null;
let reportData = null;

const staffGrid = document.getElementById("staffGrid");
const historyList = document.getElementById("historyList");
const reportReminder = document.getElementById("reportReminder");
const deviceIpLabel = document.getElementById("deviceIp");
const fullScreenButton = document.getElementById("fullScreenBtn");
const filterStartDate = document.getElementById("filterStartDate");
const filterEndDate = document.getElementById("filterEndDate");
const viewAllButton = document.getElementById("viewAll");
const filterSummary = document.getElementById("filterSummary");
const exportCsvButton = document.getElementById("exportCsv");
const clearLogButton = document.getElementById("clearLog");
const reasonModal = document.getElementById("reasonModal");
const reasonButtons = document.getElementById("reasonButtons");
const closeModalButton = document.getElementById("closeModal");
const skipReasonButton = document.getElementById("skipReason");
const modalTitle = document.getElementById("modalTitle");
const ticketModal = document.getElementById("ticketModal");
const closeTicketModalButton = document.getElementById("closeTicketModal");
const ticketYesButton = document.getElementById("ticketYes");
const ticketNoButton = document.getElementById("ticketNo");
const ticketInputGroup = document.getElementById("ticketInputGroup");
const ticketNumberInput = document.getElementById("ticketNumber");
const clockTime = document.getElementById("clockTime");
const clockDate = document.getElementById("clockDate");

async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Network error");
  }
  return response.json();
}

async function loadStaff() {
  staffList = await fetchJson("/api/staff");
  renderStaff();
}

async function loadReasons() {
  reasons = await fetchJson("/api/reasons");
}

async function loadReportReminder() {
  reportData = await fetchJson("/api/next-report");
  renderReportReminder();
}

async function loadDeviceIp() {
  const data = await fetchJson("/api/device-ip");
  deviceIpLabel.textContent = `Server IP: ${data.deviceIp}`;
}

function requestFullScreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) {
    return el.requestFullscreen();
  }
  if (el.webkitRequestFullscreen) {
    return el.webkitRequestFullscreen();
  }
  if (el.msRequestFullscreen) {
    return el.msRequestFullscreen();
  }
  return Promise.resolve();
}

function exitFullScreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }
  if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  }
  if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
  return Promise.resolve();
}

function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

function updateFullScreenButton() {
  if (!fullScreenButton) return;
  fullScreenButton.textContent = isFullscreenActive() ? "Exit Full Screen" : "Enter Full Screen";
}

async function loadHistory(startDate, endDate) {
  let url = "/api/log";
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if ([...params].length) {
    url += `?${params.toString()}`;
  }
  currentHistory = await fetchJson(url);
  renderStaff();
  renderHistory();
  renderFilterSummary(startDate, endDate);
}

function renderStaff() {
  staffGrid.innerHTML = "";
  staffList.forEach((staff) => {
    const currentStatus = getLastStatusForStaff(staff.id);
    const isLong = isLongEntry(staff.id);
    const card = document.createElement("button");
    card.className = "staff-card";
    if (isLong) {
      card.classList.add("staff-long-entry");
    } else if (currentStatus === "IN") {
      card.classList.add("staff-in");
    } else {
      card.classList.add("staff-out");
    }
    card.type = "button";
    card.dataset.staffId = staff.id;
    card.innerHTML = `
      <div class="staff-icon">${staff.icon}</div>
      <p class="staff-name">${staff.name}</p>
      <p class="staff-role">${staff.role}</p>
      <p class="staff-status">${currentStatus}</p>
    `;
    card.addEventListener("click", () => handleStaffClick(staff.id));
    staffGrid.appendChild(card);
  });
}

function getLastStatusForStaff(staffId) {
  const last = currentHistory.find((entry) => entry.staffId === staffId);
  return last ? last.action : "OUT";
}

function isLongEntry(staffId) {
  const lastEntry = currentHistory.find((entry) => entry.staffId === staffId);
  if (!lastEntry || lastEntry.action !== "IN") return false;

  const entryTime = new Date(lastEntry.timestamp);
  const now = new Date();
  const diffMs = now - entryTime;
  const hours = diffMs / (1000 * 60 * 60);
  return hours > 2;
}

function handleStaffClick(staffId) {
  selectedStaffId = staffId;
  const staff = staffList.find((item) => item.id === staffId);
  const lastAction = getLastStatusForStaff(staffId);
  const nextAction = lastAction === "IN" ? "OUT" : "IN";

  if (nextAction === "OUT") {
    submitEntry("Exit", "OUT");
    return;
  }

  openReasonModal(staffId);
}

function openReasonModal(staffId) {
  selectedStaffId = staffId;
  const staff = staffList.find((item) => item.id === staffId);
  const lastAction = getLastStatusForStaff(staffId);
  const nextAction = lastAction === "IN" ? "OUT" : "IN";
  currentAction = nextAction;
  modalTitle.textContent = `${staff.name} — ${nextAction === "IN" ? "Entry" : "Exit"}`;

  reasonButtons.innerHTML = "";
  reasons.forEach((reason) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reason-choice";
    button.innerHTML = `<strong>${reason}</strong>`;
      button.addEventListener("click", () => handleReasonChoice(reason));
      reasonButtons.appendChild(button);
    });
    showModal();
}

function handleReasonChoice(reason) {
  currentReason = reason;
  reasonModal.classList.add("hidden");
  openTicketModal();
}

async function submitEntry(reason, action, ticket = "") {
  const staff = staffList.find((item) => item.id === selectedStaffId);
  if (!staff) return;

  await fetchJson("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId: staff.id,
      action,
      reason,
      ticket,
      timestamp: new Date().toISOString(),
    }),
  });

  hideModal();
  hideTicketModal();
  await loadHistory();
}

function calculateTimeSpent(staffId, outIndex) {
  const outEntry = currentHistory[outIndex];
  if (outEntry.action !== "OUT") return null;

  for (let i = outIndex + 1; i < currentHistory.length; i++) {
    const entry = currentHistory[i];
    if (entry.staffId === staffId && entry.action === "IN") {
      const inTime = new Date(entry.timestamp);
      const outTime = new Date(outEntry.timestamp);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  }

  return null;
}

function renderFilterSummary(startDate, endDate) {
  if (!startDate && !endDate) {
    filterSummary.textContent = "Showing current log. No date filter applied.";
    return;
  }

  const parts = [];
  if (startDate) parts.push(`from ${startDate}`);
  if (endDate) parts.push(`to ${endDate}`);
  filterSummary.textContent = `Showing entries ${parts.join(" ")}.`;
}

function renderHistory() {
  if (currentHistory.length === 0) {
    historyList.innerHTML = `<p style="color:#b0b9d9; padding:1rem;">No entries found for the selected dates.</p>`;
    return;
  }

  historyList.innerHTML = "";
  currentHistory.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "log-entry";
    const timeSpent = calculateTimeSpent(entry.staffId, index);
    const timeSpentLine = timeSpent ? `<p class="log-line"><span>Time spent:</span> ${timeSpent}</p>` : "";
    const ticketLine = entry.ticket ? `<p class="log-line"><span>Ticket:</span> ${escapeHtml(entry.ticket)}</p>` : "";
    card.innerHTML = `
      <p class="log-line"><span>${entry.icon} ${entry.staffName}</span> — ${entry.staffRole}</p>
      <p class="log-line"><span>Action:</span> ${entry.action}</p>
      <p class="log-line"><span>Reason:</span> ${entry.reason}</p>
      ${ticketLine}
      <p class="log-line"><span>Time:</span> ${new Date(entry.timestamp).toLocaleString()}</p>
      ${timeSpentLine}
    `;
    historyList.appendChild(card);
  });
}

function showModal() {
  reasonModal.classList.remove("hidden");
}

function hideModal() {
  reasonModal.classList.add("hidden");
  selectedStaffId = null;
  currentAction = null;
  currentReason = null;
}

function openTicketModal() {
  ticketInputGroup.classList.add("hidden");
  ticketNumberInput.value = "";
  ticketModal.classList.remove("hidden");
}

function hideTicketModal() {
  ticketModal.classList.add("hidden");
  ticketInputGroup.classList.add("hidden");
  ticketNumberInput.value = "";
  selectedStaffId = null;
  currentAction = null;
  currentReason = null;
}

function renderReportReminder() {
  if (!reportData) return;
  const days = reportData.daysUntilReport;
  const backgroundColor = days <= 7 ? "rgba(239, 68, 68, 0.15)" : days <= 30 ? "rgba(234, 179, 8, 0.15)" : "rgba(34, 197, 94, 0.15)";
  const borderColor = days <= 7 ? "#ef4444" : days <= 30 ? "#eab308" : "#22c55e";
  const textColor = days <= 7 ? "#fca5a5" : days <= 30 ? "#fef08a" : "#86efac";
  reportReminder.innerHTML = `
    <div style="background: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 0.85rem; margin-bottom: 1rem;">
      <p style="margin: 0; color: ${textColor}; font-weight: 600; text-align: center;">
        Next Report Due In: <strong>${days} days</strong>
      </p>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openCurrentLogInNewTab(records) {
  const header = ["Staff Name", "Role", "Action", "Reason", "Ticket", "Timestamp"];
  const tableRows = records
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.staffName)}</td><td class="center-cell">${escapeHtml(entry.staffRole)}</td><td class="center-cell">${escapeHtml(entry.action)}</td><td class="center-cell">${escapeHtml(entry.reason)}</td><td class="center-cell">${escapeHtml(entry.ticket || "")}</td><td>${escapeHtml(new Date(entry.timestamp).toLocaleString())}</td></tr>`
    )
    .join("");

  const content = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Current Log</title><style>body{background:#060b16;color:#eef2ff;font-family:system-ui, sans-serif;margin:0;padding:1rem;overflow:auto;}table{width:100%;border-collapse:collapse;}th,td{padding:0.6rem 0.75rem;border:1px solid rgba(255,255,255,0.12);text-align:left;vertical-align:top;font-size:0.95rem;}.center-cell{text-align:center;}th{background:rgba(255,255,255,0.12);}tr:nth-child(odd) td{background:rgba(79, 122, 255, 0.08);}tr:nth-child(even) td{background:rgba(14, 165, 233, 0.08);}caption{caption-side:top;text-align:left;font-weight:700;font-size:1.2rem;margin-bottom:0.75rem;}body{overflow:auto;}</style></head><body><table><caption>Current Log</caption><thead><tr>${header.map((h, index) => `<th${index >= 1 && index <= 4 ? ' class="center-cell"' : ""}>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;

  const newWindow = window.open();
  if (!newWindow) {
    alert("Unable to open a new tab. Please allow popups for this site.");
    return;
  }

  newWindow.document.open();
  newWindow.document.write(content);
  newWindow.document.close();
}

async function exportCsv() {
  try {
    const response = await fetch("/api/export");
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Unable to export CSV");
    }

    const contentDisposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    const filename = filenameMatch ? filenameMatch[1] : `entrylogger-report-${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = await response.blob();

    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "CSV file",
            accept: { "text/csv": [".csv"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert("Export failed: " + error.message);
  }
}

async function clearLog() {
  const confirmSteps = [
    "Are you sure you want to clear the log and start fresh? This action will archive all previous logs.",
    "Click 'Clear and Reset' again to confirm (Step 2 of 3)"
  ];
  
  for (let i = 0; i < 2; i++) {
    if (!confirm(confirmSteps[i])) {
      return;
    }
  }
  
  const finalConfirm = prompt("Type 'CLEAR' to confirm clearing and resetting the log:");
  if (finalConfirm !== "CLEAR") {
    alert("Cancelled. Logs were not cleared.");
    return;
  }
  
  try {
    await fetchJson("/api/log", { method: "DELETE" });
    alert("Log cleared and archived successfully. Starting fresh!");
    await loadHistory();
    await loadReportReminder();
  } catch (error) {
    alert("Error clearing log: " + error.message);
  }
}

filterStartDate.addEventListener("change", () => {
  loadHistory(filterStartDate.value || null, filterEndDate.value || null);
});

filterEndDate.addEventListener("change", () => {
  loadHistory(filterStartDate.value || null, filterEndDate.value || null);
});

viewAllButton.addEventListener("click", async () => {
  filterStartDate.value = "";
  filterEndDate.value = "";
  try {
    const log = await fetchJson("/api/log");
    openCurrentLogInNewTab(log);
  } catch (error) {
    alert("Unable to open current log: " + error.message);
  }
});

fullScreenButton.addEventListener("click", () => {
  requestFullScreen().catch(() => {
    alert("Your browser blocked fullscreen mode. Please use the browser's fullscreen option.");
  });
});

document.addEventListener("fullscreenchange", () => {
  updateFullScreenMode();
  updateFullScreenButton();
});
document.addEventListener("webkitfullscreenchange", () => {
  updateFullScreenMode();
  updateFullScreenButton();
});
document.addEventListener("msfullscreenchange", () => {
  updateFullScreenMode();
  updateFullScreenButton();
});

function updateFullScreenMode() {
  const isFullscreen = isFullscreenActive();
  document.body.classList.toggle("fullscreen-mode", isFullscreen);
}

function updateClock() {
  const now = new Date();
  
  // Format time as HH:MM:SS
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Format date as MM/DD/YYYY
  const dateString = now.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  
  if (clockTime) clockTime.textContent = timeString;
  if (clockDate) clockDate.textContent = dateString;
}

exportCsvButton.addEventListener("click", exportCsv);
clearLogButton.addEventListener("click", clearLog);
closeModalButton.addEventListener("click", hideModal);
skipReasonButton.addEventListener("click", () => handleReasonChoice("Other / skipped reason"));
closeTicketModalButton.addEventListener("click", hideTicketModal);
ticketYesButton.addEventListener("click", () => {
  ticketInputGroup.classList.remove("hidden");
  ticketNumberInput.focus();
});
ticketNoButton.addEventListener("click", () => submitEntry(currentReason || "Other / skipped reason", currentAction || "IN", ""));
ticketNumberInput.addEventListener("input", () => {
  ticketNumberInput.value = ticketNumberInput.value.replace(/\D/g, "").slice(0, 5);
  if (ticketNumberInput.value.length === 5) {
    submitEntry(currentReason || "Other / skipped reason", currentAction || "IN", ticketNumberInput.value);
  }
});
reasonModal.addEventListener("click", (event) => {
  if (event.target === reasonModal || event.target.classList.contains("modal-backdrop")) {
    hideModal();
  }
});
ticketModal.addEventListener("click", (event) => {
  if (event.target === ticketModal || event.target.classList.contains("modal-backdrop")) {
    hideTicketModal();
  }
});

(async function init() {
  try {
    await Promise.all([loadStaff(), loadReasons(), loadHistory(), loadReportReminder(), loadDeviceIp()]);
    updateFullScreenMode();
    updateClock();
    setInterval(updateClock, 1000);
  } catch (error) {
    console.error(error);
    alert("Unable to load the app data. Check the server and try again.");
  }
})();
