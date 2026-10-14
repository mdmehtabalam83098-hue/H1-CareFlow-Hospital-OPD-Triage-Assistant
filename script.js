
const $ = id => document.getElementById(id);

let patients = [];
let activities = [];

try {
  const saved = JSON.parse(localStorage.getItem("h1CareFlowPatients") || "[]");
  if (Array.isArray(saved)) patients = saved;
} catch (error) {
  patients = [];
}

function logActivity(message) {
  activities.unshift({
    message,
    time: new Date().toLocaleString()
  });
  activities = activities.slice(0, 30);
}

function savePatients() {
  try {
    localStorage.setItem("h1CareFlowPatients", JSON.stringify(patients));
  } catch (error) {
    alert("Browser storage is unavailable. Your data may not be saved.");
  }
}

function showView(view) {
  $("dashboardView").classList.toggle("hidden", view !== "dashboard");
  $("formPanel").classList.add("hidden");
  $("queueView").classList.toggle("hidden", view !== "queue");
  $("historyView").classList.toggle("hidden", view !== "history");
  $("pageName").textContent =
    view === "queue" ? "OPD Queue" :
    view === "history" ? "Activity History" : "Dashboard";

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function renderDashboard() {
  $("total").textContent = patients.length;
  $("waiting").textContent = patients.filter(p => !p.reviewed).length;
  $("pending").textContent = patients.filter(p => !p.reviewed).length;
  $("flags").textContent = patients.filter(p => p.warning === "Yes").length;

  const departments = {};
  patients.forEach(p => {
    departments[p.department] = (departments[p.department] || 0) + 1;
  });

  const chart = $("departmentChart");
  chart.replaceChildren();

  const entries = Object.entries(departments);
  if (!entries.length) {
    chart.textContent = "Department statistics will appear after demo registrations.";
  }

  const max = Math.max(1, ...entries.map(([, count]) => count));
  entries.forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.textContent = name;

    const track = document.createElement("div");
    track.className = "bar-bg";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.width = `${count / max * 100}%`;
    track.appendChild(bar);

    const value = document.createElement("strong");
    value.textContent = count;

    row.append(label, track, value);
    chart.appendChild(row);
  });

  renderActivity($("recentActivity"), activities.slice(0, 5));
  renderActivity($("historyList"), activities);
}

function renderActivity(container, items) {
  container.replaceChildren();
  if (!items.length) {
    container.textContent = "No activity recorded in this session.";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "activity-item";
    div.textContent = `${item.message} · ${item.time}`;
    container.appendChild(div);
  });
}

function renderQueue() {
  const tbody = $("patientRows");
  tbody.replaceChildren();
  $("emptyQueue").classList.toggle("hidden", patients.length > 0);

  patients.forEach((patient, index) => {
    const row = document.createElement("tr");

    const name = document.createElement("td");
    name.textContent = patient.name;

    const dept = document.createElement("td");
    dept.textContent = patient.department;

    const concern = document.createElement("td");
    concern.textContent = patient.concern;

    const flag = document.createElement("td");
    flag.textContent = patient.warning === "Yes" ? "Staff attention flag" : "None reported";
    if (patient.warning === "Yes") flag.className = "flag";

    const review = document.createElement("td");
    const button = document.createElement("button");
    button.className = "secondary review-btn";
    button.textContent = patient.reviewed ? "Reviewed" : "Mark reviewed";
    button.disabled = patient.reviewed;

    button.addEventListener("click", () => {
      patients[index].reviewed = true;
      logActivity(`Staff review status updated for ${patient.name}`);
      savePatients();
      renderAll();
    });

    review.appendChild(button);
    row.append(name, dept, concern, flag, review);
    tbody.appendChild(row);
  });
}

function renderAll() {
  renderDashboard();
  renderQueue();
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$("showForm").addEventListener("click", () => {
  showView("dashboard");
  $("formPanel").classList.remove("hidden");
  $("formPanel").scrollIntoView({ behavior: "smooth" });
});

$("cancelForm").addEventListener("click", () => {
  $("formPanel").classList.add("hidden");
});

$("patientForm").addEventListener("submit", event => {
  event.preventDefault();

  const patient = {
    name: $("patientName").value.trim(),
    department: $("department").value,
    concern: $("concern").value.trim(),
    warning: $("warning").value,
    reviewed: false
  };

  if (!patient.name || !patient.concern) return;

  patients.unshift(patient);
  logActivity(`Fictional registration recorded for ${patient.name}`);
  savePatients();
  renderAll();
  event.target.reset();
  $("formPanel").classList.add("hidden");
  showView("dashboard");
});

$("exportCSV").addEventListener("click", () => {
  const escapeCSV = value =>
    '"' + String(value).replace(/"/g, '""') + '"';

  const rows = [
    ["Patient", "Department", "Reported concern", "Reported flag", "Staff reviewed"],
    ...patients.map(p => [
      p.name, p.department, p.concern, p.warning, p.reviewed ? "Yes" : "No"
    ])
  ];

  const csv = rows.map(row => row.map(escapeCSV).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "H1-CareFlow-Demo.csv";
  link.click();
  URL.revokeObjectURL(url);
});

renderAll();
