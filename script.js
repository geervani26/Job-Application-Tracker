// ============================================
// 1. CONFIGURATION & STATE
// ============================================
const STORAGE_KEY = "jobTrackerCommandCenter";

// DOM Elements
const applicationForm = document.getElementById("applicationForm");
const companyInput = document.getElementById("company");
const jobRoleInput = document.getElementById("jobRole");
const statusInput = document.getElementById("status");
const applicationDateInput = document.getElementById("applicationDate");
const notesInput = document.getElementById("notes");

const formCard = document.getElementById("formCard");
const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const pageTitle = document.getElementById("pageTitle");

let applications = [];
let editingApplicationId = null;
let funnelChartInstance = null;

// ============================================
// 2. UTILITIES & TOASTS
// ============================================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.style.borderLeftColor = type === "success" ? "var(--success)" : "var(--danger)";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split("-");
    
    // Create an array of month names
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Get the month name using the index (month is 1-based, array is 0-based)
    const monthName = months[parseInt(month) - 1];
    
    // Return in "DD Mon YYYY" format
    return `${parseInt(day)} ${monthName} ${year}`;
}
// ============================================
// 3. STORAGE & INITIALIZATION
// ============================================
function loadApplications() {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Ensure we filter out any bad data (missing company or role)
    const parsed = saved ? JSON.parse(saved) : [];
    applications = parsed.filter(app => app.company && app.jobRole);
}

function saveApplications(updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    applications = updated;
    updateDashboard();
    showToast("Application saved successfully!");
}

// ============================================
// 4. NAVIGATION
// ============================================
document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
        item.classList.add("active");
        document.querySelectorAll(".view-section").forEach(view => view.classList.remove("active-view"));
        const targetId = item.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active-view");
        pageTitle.textContent = item.textContent.trim();
    });
});

// ============================================
// 5. DASHBOARD & CHARTS
// ============================================
function updateDashboard() {
    document.getElementById("totalApplications").textContent = applications.length;
    document.getElementById("totalInterviews").textContent = applications.filter(a => a.status === "Interview").length;
    document.getElementById("totalOffers").textContent = applications.filter(a => a.status === "Offer Received").length;
    document.getElementById("totalRejected").textContent = applications.filter(a => a.status === "Rejected").length;

    renderFunnelChart();

    const total = applications.length;
    const interviewCount = applications.filter(a => a.status === "Interview").length;
    const rate = total ? Math.round((interviewCount / total) * 100) : 0;
    document.getElementById("insightInterviewRate").textContent = `${rate}% of applications lead to interviews.`;
    document.getElementById("insightPending").textContent = `${applications.filter(a => a.status === "Applied").length} applications are waiting for a response.`;

    renderTable();
    renderKanbanBoard();
}

function renderFunnelChart() {
    const ctx = document.getElementById("funnelChart").getContext("2d");
    const data = [
        applications.length,
        applications.filter(a => ["Interview", "Offer Received"].includes(a.status)).length,
        applications.filter(a => a.status === "Offer Received").length
    ];

    if (funnelChartInstance) funnelChartInstance.destroy();

    funnelChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["Applied", "Interviews", "Offers"],
            datasets: [{ data: data, backgroundColor: ["#6366f1", "#f59e0b", "#10b981"], borderRadius: 6, barThickness: 40 }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { weight: 'bold' } } }
            }
        }
    });
}

// ============================================
// 6. KANBAN BOARD (Fixed Text)
// ============================================
function renderKanbanBoard() {
    const columns = {
        "Applied": document.getElementById("col-Applied"),
        "Interview": document.getElementById("col-Interview"),
        "Offer Received": document.getElementById("col-Offer"),
        "Rejected": document.getElementById("col-Rejected")
    };
    Object.values(columns).forEach(col => col.innerHTML = "");

    applications.forEach(app => {
        let targetCol = columns["Applied"];
        if (app.status === "Interview") targetCol = columns["Interview"];
        if (app.status === "Offer Received") targetCol = columns["Offer Received"];
        if (app.status === "Rejected") targetCol = columns["Rejected"];

        const card = document.createElement("div");
        card.className = "kanban-card";
        
        // This ensures the text is properly structured inside the card
        card.innerHTML = `
            <h4>${app.company}</h4>
            <p>${app.jobRole}</p>
        `;
        
        card.onclick = () => editApplication(app.id);
        targetCol.appendChild(card);
    });

    document.getElementById("count-Applied").textContent = applications.filter(a => a.status === "Applied").length;
    document.getElementById("count-Interview").textContent = applications.filter(a => a.status === "Interview").length;
    document.getElementById("count-Offer").textContent = applications.filter(a => a.status === "Offer Received").length;
    document.getElementById("count-Rejected").textContent = applications.filter(a => a.status === "Rejected").length;
}

// ============================================
// 7. CRUD OPERATIONS (Fixed Data Saving)
// ============================================
applicationForm.addEventListener("submit", function (e) {
    e.preventDefault();
    
    // Get values and ensure they aren't empty
    const appData = {
        company: companyInput.value.trim(),
        jobRole: jobRoleInput.value.trim(),
        status: statusInput.value,
        applicationDate: applicationDateInput.value,
        notes: notesInput.value.trim()
    };

    if (!appData.company || !appData.jobRole) {
        showToast("Company and Job Role cannot be empty.", "danger");
        return;
    }

    if (editingApplicationId) {
        // Update existing
        const updated = applications.map(app => 
            app.id === editingApplicationId ? { ...app, ...appData } : app
        );
        saveApplications(updated);
        resetForm();
        showToast("Application updated successfully!");
    } else {
        // Create new
        const newApp = { 
            id: crypto.randomUUID(), 
            ...appData, 
            createdAt: new Date().toISOString() 
        };
        saveApplications([...applications, newApp]);
        resetForm();
        showToast("Application added successfully!");
    }
});

function editApplication(id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    
    editingApplicationId = id;
    companyInput.value = app.company;
    jobRoleInput.value = app.jobRole;
    statusInput.value = app.status;
    applicationDateInput.value = app.applicationDate;
    notesInput.value = app.notes;

    formTitle.textContent = "Edit Application";
    submitButton.textContent = "Update Application";
    cancelEditButton.style.display = "block";
    
    document.querySelector('[data-target="view-applications"]').click();
    formCard.scrollIntoView({ behavior: 'smooth' });
}

function deleteApplication(id) {
    if (!confirm("Delete this application?")) return;
    const updated = applications.filter(a => a.id !== id);
    saveApplications(updated); // Update UI and storage
    showToast("Application deleted.", "danger");
}

function resetForm() {
    applicationForm.reset();
    editingApplicationId = null;
    formTitle.textContent = "Add New Application";
    submitButton.textContent = "Save Application";
    cancelEditButton.style.display = "none";
    applicationDateInput.value = new Date().toISOString().slice(0, 10);
}

cancelEditButton.addEventListener("click", resetForm);

// ============================================
// 8. TABLE RENDERING (Fixed Display)
// ============================================
function renderTable() {
    const tbody = document.getElementById("fullApplicationTableBody");
    tbody.innerHTML = "";
    
    if (applications.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No applications yet.</td></tr>`;
        return;
    }

    const sorted = [...applications].sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));

    sorted.forEach(app => {
        const tr = document.createElement("tr");
        const statusClass = app.status === "Offer Received" ? "offer" : app.status.toLowerCase();
        
        tr.innerHTML = `
            <td><strong>${app.company}</strong></td>
            <td>${app.jobRole}</td>
            <td>${formatDate(app.applicationDate)}</td>
            <td><span class="status-pill ${statusClass}">${app.status}</span></td>
            <td style="text-align: right;"></td>
        `;

        const actionTd = tr.lastElementChild;

        const editBtn = document.createElement("button");
        editBtn.className = "action-btn edit-btn";
        editBtn.innerHTML = "✏️";
        editBtn.title = "Edit Application";
        editBtn.addEventListener("click", () => editApplication(app.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.title = "Delete Application";
        deleteBtn.addEventListener("click", () => deleteApplication(app.id));

        actionTd.appendChild(editBtn);
        actionTd.appendChild(deleteBtn);

        tbody.appendChild(tr);
    });
}

// ============================================
// 9. PDF EXPORT / IMPORT
// ============================================
document.getElementById("exportButton").addEventListener("click", async () => {
    if (applications.length === 0) return showToast("No data to export", "danger");
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage([600, 800]);
    page.drawText("Job Application Command Center", { x: 50, y: 750, size: 24, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    let y = 700;
    applications.forEach(app => {
        page.drawText(`${app.company} - ${app.jobRole}`, { x: 50, y, size: 12, font: fontBold });
        page.drawText(`Status: ${app.status} | Date: ${app.applicationDate}`, { x: 50, y: y - 15, size: 10, font });
        y -= 40;
    });
    pdfDoc.setSubject(JSON.stringify(applications));
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Job_Applications_Export.pdf";
    link.click();
    showToast("PDF Exported successfully!");
});

document.getElementById("importButton").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const jsonStr = pdfDoc.getSubject();
        if (!jsonStr) throw new Error("No data found in PDF.");
        const importedData = JSON.parse(jsonStr);
        if (!Array.isArray(importedData)) throw new Error("Invalid data format.");
        if (confirm(`Import ${importedData.length} applications?`)) {
            saveApplications(importedData);
            showToast(`Imported ${importedData.length} applications!`);
        }
    } catch (err) {
        showToast("Failed to import. Use a valid generated PDF.", "danger");
    }
    e.target.value = "";
});

// ============================================
// 10. PROFILE & INIT
// ============================================
function loadProfileUI() {
    const session = JSON.parse(localStorage.getItem('jobTrackerSession')) || { name: 'Guest User', email: 'guest@example.com' };
    const extendedProfile = JSON.parse(localStorage.getItem('jobTrackerExtendedProfile')) || {};
    
    const profile = {
        name: session.name,
        email: session.email,
        role: extendedProfile.role || 'Job Seeker',
        phone: extendedProfile.phone || 'Not set',
        location: extendedProfile.location || 'Not set'
    };

    document.getElementById("profileName").textContent = profile.name;
    document.getElementById("avatarInitials").textContent = profile.name.charAt(0).toUpperCase();
    
    document.getElementById("profileViewName").textContent = profile.name;
    document.getElementById("profileViewRole").textContent = profile.role;
    document.getElementById("profileViewEmail").textContent = profile.email;
    document.getElementById("profileViewPhone").textContent = profile.phone;
    document.getElementById("profileViewLocation").textContent = profile.location;
    document.getElementById("profileViewAvatar").textContent = profile.name.charAt(0).toUpperCase();

    document.getElementById("editName").value = profile.name;
    document.getElementById("editRole").value = profile.role;
    document.getElementById("editEmail").value = profile.email;
    document.getElementById("editPhone").value = extendedProfile.phone || '';
    document.getElementById("editLocation").value = extendedProfile.location || '';
}

function setupProfileForm() {
    const form = document.getElementById("profileEditForm");
    
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const newName = document.getElementById("editName").value.trim();
        const newRole = document.getElementById("editRole").value.trim();
        const newEmail = document.getElementById("editEmail").value.trim();
        const newPhone = document.getElementById("editPhone").value.trim();
        const newLocation = document.getElementById("editLocation").value.trim();

        const session = JSON.parse(localStorage.getItem('jobTrackerSession')) || {};
        session.name = newName;
        session.email = newEmail;
        localStorage.setItem('jobTrackerSession', JSON.stringify(session));

        const extendedProfile = { role: newRole, phone: newPhone, location: newLocation };
        localStorage.setItem('jobTrackerExtendedProfile', JSON.stringify(extendedProfile));

        loadProfileUI();
        showToast("Profile updated successfully!");
    });
}

function init() {
    loadApplications();
    loadProfileUI();     
    setupProfileForm();  
    
    applicationDateInput.value = new Date().toISOString().slice(0, 10);
    updateDashboard();
}

init();