/* ==========================================================================
   PERBEEN HAQUE MEDICAL TRACKER - CORE APPLICATION SCRIPT
   ========================================================================== */

// Application State
let appState = {
    patient: {},
    doctors: [],
    prescriptions: [],
    tests: [],
    history: [],
    takenDoses: {} // Schema: { 'YYYY-MM-DD_rx-1': true }
};

// Editing State Keepers
let currentEditId = null;
let currentEditType = null; // 'profile', 'doctor', 'prescription', 'test', 'history'

// Chart Instances
let trendsChartInstance = null;
let rxDoctorChartInstance = null;
let testCategoryChartInstance = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initAppEvents();
    renderAll();
    
    // Set default schedule date to today in input
    const todayStr = getLocalDateString(new Date());
    document.getElementById("scheduleDatePicker").value = todayStr;
    document.getElementById("currentDateDisplay").innerText = formatFriendlyDate(new Date());
    
    // Trigger Lucide icons initialization
    lucide.createIcons();
});

// Load Data from LocalStorage or Mock Data
function loadData() {
    const savedData = localStorage.getItem("my_health_tracker_data");
    if (savedData) {
        try {
            appState = JSON.parse(savedData);
        } catch (e) {
            console.error("Failed to parse saved data, falling back to mock data.", e);
            appState = {...INITIAL_MOCK_DATA, takenDoses: {}};
        }
    } else {
        // First load: seed with initial mock data
        appState = {...INITIAL_MOCK_DATA, takenDoses: {}};
        saveStateToLocalStorage();
    }
}

// Save current appState to LocalStorage
function saveStateToLocalStorage() {
    localStorage.setItem("my_health_tracker_data", JSON.stringify(appState));
}

/* ==========================================================================
   ROUTING & NAVIGATION
   ========================================================================== */

function initAppEvents() {
    // Navigation Tabs
    const navButtons = document.querySelectorAll(".nav-item");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
            
            // On mobile, close sidebar on nav click
            document.querySelector(".sidebar").classList.remove("mobile-open");
        });
    });

    // Mobile Sidebar Menu Button
    const menuToggleBtn = document.getElementById("menuToggleBtn");
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener("click", () => {
            document.querySelector(".sidebar").classList.toggle("mobile-open");
        });
    }

    // Schedule Date Picker Change
    const schedulePicker = document.getElementById("scheduleDatePicker");
    schedulePicker.addEventListener("change", (e) => {
        const selectedDate = new Date(e.target.value);
        document.getElementById("scheduleDateStr").innerText = formatFriendlyDate(selectedDate);
        renderScheduleList(selectedDate);
    });

    // Analytics Chart Metric Change
    const chartSelect = document.getElementById("chartTestType");
    chartSelect.addEventListener("change", () => {
        renderTrendsChart();
    });

    // Edit Profile Trigger
    document.getElementById("editProfileBtn").addEventListener("click", () => {
        openProfileModal();
    });
}

function switchTab(tabId) {
    // Update nav items
    document.querySelectorAll(".nav-item").forEach(btn => {
        if (btn.getAttribute("data-tab") === tabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Update tab visibility
    document.querySelectorAll(".tab-content").forEach(tab => {
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    // Update header title
    const titles = {
        dashboard: "Dashboard Overview",
        prescriptions: "Prescriptions Tracker",
        tests: "Lab Test Results",
        history: "Medical & Clinical History",
        doctors: "Doctors Directory",
        analytics: "Analytics & Biomarker Charts",
        datacenter: "Data Center & Backup"
    };
    document.getElementById("pageTitle").innerText = titles[tabId] || "Dashboard";

    // Perform specific render calls when switching tabs
    if (tabId === "dashboard") {
        renderDashboardStats();
        const dateVal = document.getElementById("scheduleDatePicker").value;
        renderScheduleList(dateVal ? new Date(dateVal) : new Date());
    } else if (tabId === "prescriptions") {
        renderPrescriptions();
    } else if (tabId === "tests") {
        renderTests();
    } else if (tabId === "history") {
        renderHistory();
    } else if (tabId === "doctors") {
        renderDoctors();
    } else if (tabId === "analytics") {
        populateChartBiomarkersDropdown();
        setTimeout(() => {
            renderCharts();
        }, 100);
    } else if (tabId === "datacenter") {
        // Clear any previous import status messages when switching
        const statusBox = document.getElementById("importStatus");
        if (statusBox) {
            statusBox.className = "import-status-box hidden";
            statusBox.innerText = "";
        }
    }
}

/* ==========================================================================
   RENDERERS & CRUD RENDERERS
   ========================================================================== */

function renderAll() {
    renderDashboardStats();
    populateDoctorSelects();
    renderScheduleList(new Date());
    renderPrescriptions();
    renderTests();
    renderHistory();
    renderDoctors();
    populateChartBiomarkersDropdown();
    // Render profile card elements
    renderProfileCard();
}

// Render Patient Profile Info
function renderProfileCard() {
    const patient = appState.patient;
    document.getElementById("profileName").innerText = patient.name;
    
    // Calculate Age
    let dobText = patient.dob;
    if (patient.dob) {
        const dob = new Date(patient.dob);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        dobText = `${formatFriendlyDate(dob)} (${age} Years)`;
    }
    
    document.getElementById("profileDob").innerText = dobText;
    document.getElementById("profileBlood").innerText = patient.bloodGroup;
    document.getElementById("profileAllergies").innerText = patient.allergies || "None";
    document.getElementById("profilePhone").innerText = patient.phone;
    
    // Emergency contact card updates
    const emParts = patient.emergencyContact ? patient.emergencyContact.split("-") : [];
    const emName = emParts[0] ? emParts[0].trim() : "None";
    const emPhone = emParts[1] ? emParts[1].trim() : "";
    
    const sidebarFooter = document.querySelector(".sidebar-footer .emergency-contact");
    if (sidebarFooter) {
        sidebarFooter.querySelector(".value").innerText = emName;
        sidebarFooter.querySelector(".phone").innerText = emPhone;
    }
    
    const sidebarBlood = document.querySelector(".sidebar-footer .blood-badge strong");
    if (sidebarBlood) {
        sidebarBlood.innerText = patient.bloodGroup;
    }
    
    const topNavbarAllergy = document.querySelector(".top-navbar .allergy-tag");
    if (topNavbarAllergy) {
        topNavbarAllergy.innerHTML = `<i data-lucide="alert-triangle"></i> Allergies: ${patient.allergies || "None"}`;
        lucide.createIcons();
    }
}

// Render Summary Statistics Card on Dashboard
function renderDashboardStats() {
    // 1. Active Prescriptions
    const activeRxsCount = appState.prescriptions.filter(rx => rx.active).length;
    document.getElementById("statActiveMeds").innerText = activeRxsCount;

    // 2. Pending Tests
    const pendingTestsCount = appState.tests.filter(t => t.status === "pending").length;
    document.getElementById("statPendingTests").innerText = pendingTestsCount;

    // 3. Medical History Active Items
    const activeHistoryCount = appState.history.filter(h => h.status === "active").length;
    document.getElementById("statHistoryEntries").innerText = activeHistoryCount;

    // 4. Doctors Count
    const docsCount = appState.doctors.length;
    document.getElementById("statDoctorsCount").innerText = docsCount;
}

// Populate Dropdowns selecting Doctors in forms
function populateDoctorSelects() {
    const selects = ["rxDoctorId", "testDoctorId", "histDoctorId"];
    selects.forEach(selectId => {
        const selectEl = document.getElementById(selectId);
        if (selectEl) {
            selectEl.innerHTML = selectId === "histDoctorId" ? `<option value="">None / Other</option>` : "";
            appState.doctors.forEach(doc => {
                const opt = document.createElement("option");
                opt.value = doc.id;
                opt.innerText = `${doc.name} (${doc.specialty})`;
                selectEl.appendChild(opt);
            });
        }
    });
    
    // Filter selectors
    const rxFilter = document.getElementById("rxDoctorFilter");
    if (rxFilter) {
        rxFilter.innerHTML = `<option value="">All Doctors</option>`;
        appState.doctors.forEach(doc => {
            rxFilter.innerHTML += `<option value="${doc.id}">${doc.name}</option>`;
        });
    }

    const testFilter = document.getElementById("testDoctorFilter");
    if (testFilter) {
        testFilter.innerHTML = `<option value="">All Doctors</option>`;
        appState.doctors.forEach(doc => {
            testFilter.innerHTML += `<option value="${doc.id}">${doc.name}</option>`;
        });
    }
}

/* ==========================================================================
   DAILY SCHEDULE CALCULATION & TIMELINE
   ========================================================================== */

function renderScheduleList(targetDate) {
    const container = document.getElementById("todayScheduleList");
    if (!container) return;

    container.innerHTML = "";
    
    const targetDateMidnight = new Date(targetDate);
    targetDateMidnight.setHours(0,0,0,0);
    
    const scheduledMeds = appState.prescriptions.filter(rx => {
        if (!rx.active) return false;
        
        const start = new Date(rx.startDate);
        start.setHours(0,0,0,0);
        
        // If current date is before start date, not active yet
        if (targetDateMidnight < start) return false;
        
        // If fixed_period, check end date
        if (rx.scheduleType === "fixed_period" && rx.endDate) {
            const end = new Date(rx.endDate);
            end.setHours(0,0,0,0);
            if (targetDateMidnight > end) return false;
        }

        // If interval (periodic) with an end date, check it
        if (rx.scheduleType === "interval" && rx.endDate) {
            const end = new Date(rx.endDate);
            end.setHours(0,0,0,0);
            if (targetDateMidnight > end) return false;
        }
        
        // Schedule rule check
        if (rx.scheduleType === "continuous" || rx.scheduleType === "fixed_period") {
            // Daily dosage
            return true;
        }
        
        if (rx.scheduleType === "interval") {
            const diffTime = targetDateMidnight - start;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (rx.intervalUnit === "days") {
                return diffDays % rx.intervalValue === 0;
            } else if (rx.intervalUnit === "weeks") {
                return diffDays % (rx.intervalValue * 7) === 0;
            } else if (rx.intervalUnit === "months") {
                const monthsDiff = (targetDateMidnight.getFullYear() - start.getFullYear()) * 12 + (targetDateMidnight.getMonth() - start.getMonth());
                return monthsDiff >= 0 && monthsDiff % rx.intervalValue === 0 && targetDateMidnight.getDate() === start.getDate();
            }
        }
        
        return false;
    });

    if (scheduledMeds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="smile"></i>
                <p>No medications scheduled for this date.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    scheduledMeds.forEach(rx => {
        const doc = appState.doctors.find(d => d.id === rx.doctorId);
        const docName = doc ? doc.name : "Unknown Doctor";
        
        // Check if taken on this date
        const dateKey = `${getLocalDateString(targetDateMidnight)}_${rx.id}`;
        const isTaken = !!appState.takenDoses[dateKey];
        
        const scheduleItem = document.createElement("div");
        scheduleItem.className = `schedule-item ${isTaken ? 'taken' : ''}`;
        
        scheduleItem.innerHTML = `
            <div class="schedule-item-left">
                <div class="schedule-checkbox ${isTaken ? 'checked' : ''}" onclick="toggleMedTaken('${dateKey}', ${isTaken})">
                    <i data-lucide="check"></i>
                </div>
                <div class="med-details">
                    <h4 class="med-name">${escapeHTML(rx.medicineName)}</h4>
                    <p class="dosage-info">${escapeHTML(rx.dosage)} &bull; Prescribed by ${escapeHTML(docName)}</p>
                    ${rx.instructions ? `<p class="dosage-info text-italic" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">* ${escapeHTML(rx.instructions)}</p>` : ''}
                </div>
            </div>
            <div class="schedule-item-right">
                <span class="time-tag">${getScheduleTagText(rx)}</span>
            </div>
        `;
        
        container.appendChild(scheduleItem);
    });
    
    lucide.createIcons();
}

function getScheduleTagText(rx) {
    if (rx.scheduleType === "continuous") return "Daily";
    if (rx.scheduleType === "fixed_period") return "Fixed Course";
    if (rx.scheduleType === "interval") {
        return `Every ${rx.intervalValue} ${rx.intervalValue === 1 ? rx.intervalUnit.replace('s', '') : rx.intervalUnit}`;
    }
    return "Meds";
}

function toggleMedTaken(dateKey, currentStatus) {
    if (currentStatus) {
        delete appState.takenDoses[dateKey];
    } else {
        appState.takenDoses[dateKey] = true;
    }
    saveStateToLocalStorage();
    
    // Re-render schedule list for current date picker value
    const dateVal = document.getElementById("scheduleDatePicker").value;
    renderScheduleList(dateVal ? new Date(dateVal) : new Date());
}

/* ==========================================================================
   PRESCRIPTIONS SUB-TAB CRUD
   ========================================================================== */

// Event Listeners for Filters
if (document.getElementById("rxSearch")) {
    document.getElementById("rxSearch").addEventListener("input", renderPrescriptions);
    document.getElementById("rxDoctorFilter").addEventListener("change", renderPrescriptions);
    document.getElementById("rxStatusFilter").addEventListener("change", renderPrescriptions);
}

function renderPrescriptions() {
    const container = document.getElementById("prescriptionsContainer");
    if (!container) return;

    container.innerHTML = "";

    const query = document.getElementById("rxSearch").value.toLowerCase().trim();
    const docFilter = document.getElementById("rxDoctorFilter").value;
    const statusFilter = document.getElementById("rxStatusFilter").value;

    const filtered = appState.prescriptions.filter(rx => {
        // Match Search Query
        const matchQuery = rx.medicineName.toLowerCase().includes(query) || 
                           rx.dosage.toLowerCase().includes(query) || 
                           (rx.instructions && rx.instructions.toLowerCase().includes(query));
        
        // Match Doctor Filter
        const matchDoc = !docFilter || rx.doctorId === docFilter;

        // Match Status Filter
        let matchStatus = true;
        if (statusFilter === "active") matchStatus = rx.active;
        if (statusFilter === "inactive") matchStatus = !rx.active;

        return matchQuery && matchDoc && matchStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i data-lucide="pill"></i>
                <p>No prescriptions found matching filters.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(rx => {
        const doc = appState.doctors.find(d => d.id === rx.doctorId);
        const docName = doc ? doc.name : "Unknown Doctor";
        const statusBadge = rx.active ? '<span class="badge badge-active">Active</span>' : '<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">Discontinued</span>';
        
        let scheduleDesc = "";
        if (rx.scheduleType === "continuous") {
            scheduleDesc = "Continuous Daily dosage schedule";
        } else if (rx.scheduleType === "fixed_period") {
            scheduleDesc = `Fixed course: ${formatFriendlyDate(new Date(rx.startDate))} to ${formatFriendlyDate(new Date(rx.endDate))}`;
        } else if (rx.scheduleType === "interval") {
            scheduleDesc = `Interval: Every ${rx.intervalValue} ${rx.intervalUnit} starting ${formatFriendlyDate(new Date(rx.startDate))}`;
            if (rx.endDate) {
                scheduleDesc += ` until ${formatFriendlyDate(new Date(rx.endDate))}`;
            }
        }

        const card = document.createElement("div");
        card.className = `card-item ${!rx.active ? 'inactive' : ''}`;
        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-title-group">
                        <h3>${escapeHTML(rx.medicineName)}</h3>
                        <span class="doc-badge"><i data-lucide="user"></i> Prescribed by: ${escapeHTML(docName)}</span>
                    </div>
                    <div>
                        ${statusBadge}
                    </div>
                </div>
                
                <div class="card-details-list">
                    <div class="card-detail">
                        <span class="label">Dosage Instructions</span>
                        <span class="value">${escapeHTML(rx.dosage)}</span>
                    </div>
                    <div class="card-detail">
                        <span class="label">Schedule & Period</span>
                        <span class="value">${scheduleDesc}</span>
                    </div>
                    ${rx.instructions ? `
                    <div class="card-detail">
                        <span class="label">Special Precautions</span>
                        <span class="value" style="font-style: italic; color: var(--warning-color);">${escapeHTML(rx.instructions)}</span>
                    </div>` : ''}
                </div>
            </div>

            <div class="card-actions">
                <button class="btn btn-icon btn-edit" title="Edit Prescription" onclick="editPrescription('${rx.id}')">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn btn-icon btn-delete" title="Delete Prescription" onclick="deletePrescription('${rx.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}

function openPrescriptionModal(editRx = null) {
    // Ensure doctors exist before letting user add a prescription
    if (appState.doctors.length === 0) {
        alert("Please add a doctor in the Doctors Directory tab first before entering prescriptions.");
        switchTab("doctors");
        return;
    }

    populateDoctorSelects();
    const modalForm = document.getElementById("prescriptionForm");
    modalForm.reset();
    
    if (editRx) {
        document.getElementById("prescriptionModalTitle").innerText = "Edit Prescription";
        document.getElementById("rxId").value = editRx.id;
        document.getElementById("rxMedicineName").value = editRx.medicineName;
        document.getElementById("rxDoctorId").value = editRx.doctorId;
        document.getElementById("rxDosage").value = editRx.dosage;
        document.getElementById("rxStartDate").value = editRx.startDate;
        
        // Select schedule type radio
        const radios = document.getElementsByName("rxScheduleType");
        radios.forEach(r => {
            if (r.value === editRx.scheduleType) {
                r.checked = true;
            }
        });
        
        toggleScheduleFields(editRx.scheduleType);
        
        if (editRx.scheduleType === "fixed_period") {
            document.getElementById("rxEndDate").value = editRx.endDate;
        } else if (editRx.scheduleType === "interval") {
            document.getElementById("rxIntervalValue").value = editRx.intervalValue;
            document.getElementById("rxIntervalUnit").value = editRx.intervalUnit;
            document.getElementById("rxIntervalEndDate").value = editRx.endDate;
        }
        
        document.getElementById("rxInstructions").value = editRx.instructions || "";
        document.getElementById("rxActive").checked = editRx.active;
        document.getElementById("rxActiveGroup").classList.remove("hidden");
        
        currentEditId = editRx.id;
        currentEditType = "prescription";
    } else {
        document.getElementById("prescriptionModalTitle").innerText = "Add Prescription";
        document.getElementById("rxId").value = "";
        document.getElementById("rxStartDate").value = getLocalDateString(new Date());
        toggleScheduleFields("continuous");
        document.getElementById("rxActiveGroup").classList.add("hidden");
        
        currentEditId = null;
        currentEditType = null;
    }
    
    openModal("prescriptionModal");
}

function toggleScheduleFields(type) {
    const fixedFields = document.getElementById("fixedPeriodFields");
    const intervalFields = document.getElementById("intervalFields");
    
    fixedFields.classList.add("hidden");
    intervalFields.classList.add("hidden");
    
    // Remove required attributes
    document.getElementById("rxEndDate").required = false;
    document.getElementById("rxIntervalValue").required = false;

    if (type === "fixed_period") {
        fixedFields.classList.remove("hidden");
        document.getElementById("rxEndDate").required = true;
    } else if (type === "interval") {
        intervalFields.classList.remove("hidden");
        document.getElementById("rxIntervalValue").required = true;
    }
}

function savePrescription(event) {
    event.preventDefault();
    
    const rxId = document.getElementById("rxId").value;
    const medicineName = document.getElementById("rxMedicineName").value.trim();
    const doctorId = document.getElementById("rxDoctorId").value;
    const dosage = document.getElementById("rxDosage").value.trim();
    const startDate = document.getElementById("rxStartDate").value;
    const scheduleType = document.querySelector('input[name="rxScheduleType"]:checked').value;
    
    let endDate = "";
    let intervalValue = 1;
    let intervalUnit = "days";
    
    if (scheduleType === "fixed_period") {
        endDate = document.getElementById("rxEndDate").value;
    } else if (scheduleType === "interval") {
        intervalValue = parseInt(document.getElementById("rxIntervalValue").value, 10);
        intervalUnit = document.getElementById("rxIntervalUnit").value;
        endDate = document.getElementById("rxIntervalEndDate").value; // might be empty
    }
    
    const instructions = document.getElementById("rxInstructions").value.trim();
    const active = rxId ? document.getElementById("rxActive").checked : true;
    
    if (rxId) {
        // Edit Mode
        const index = appState.prescriptions.findIndex(p => p.id === rxId);
        if (index !== -1) {
            appState.prescriptions[index] = {
                id: rxId,
                medicineName, doctorId, dosage, instructions, scheduleType,
                startDate, endDate, intervalValue, intervalUnit, active
            };
        }
    } else {
        // Add Mode
        const newRx = {
            id: "rx-" + Date.now(),
            medicineName, doctorId, dosage, instructions, scheduleType,
            startDate, endDate, intervalValue, intervalUnit, active: true
        };
        appState.prescriptions.push(newRx);
    }
    
    saveStateToLocalStorage();
    closeModal("prescriptionModal");
    renderPrescriptions();
    renderDashboardStats();
    
    // Refresh schedule
    const dateVal = document.getElementById("scheduleDatePicker").value;
    renderScheduleList(dateVal ? new Date(dateVal) : new Date());
}

function editPrescription(id) {
    const rx = appState.prescriptions.find(p => p.id === id);
    if (rx) {
        openPrescriptionModal(rx);
    }
}

function deletePrescription(id) {
    if (confirm("Are you sure you want to delete this prescription? All history of today's checks will be preserved, but the prescription schedule will be deleted.")) {
        appState.prescriptions = appState.prescriptions.filter(p => p.id !== id);
        saveStateToLocalStorage();
        renderPrescriptions();
        renderDashboardStats();
        // Refresh schedule
        const dateVal = document.getElementById("scheduleDatePicker").value;
        renderScheduleList(dateVal ? new Date(dateVal) : new Date());
    }
}

/* ==========================================================================
   LAB TESTS SUB-TAB CRUD
   ========================================================================== */

if (document.getElementById("testSearch")) {
    document.getElementById("testSearch").addEventListener("input", renderTests);
    document.getElementById("testDoctorFilter").addEventListener("change", renderTests);
    document.getElementById("testCategoryFilter").addEventListener("change", renderTests);
    document.getElementById("testStatusFilter").addEventListener("change", renderTests);
}

// Populate Category Filter dropdown dynamically
function populateTestCategoryFilter() {
    const filterSelect = document.getElementById("testCategoryFilter");
    if (!filterSelect) return;
    
    const categories = [...new Set(appState.tests.map(t => t.category).filter(Boolean))];
    filterSelect.innerHTML = `<option value="">All Categories</option>`;
    
    categories.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function renderTests() {
    const container = document.getElementById("testsContainer");
    if (!container) return;

    container.innerHTML = "";
    populateTestCategoryFilter();

    const query = document.getElementById("testSearch").value.toLowerCase().trim();
    const docFilter = document.getElementById("testDoctorFilter").value;
    const catFilter = document.getElementById("testCategoryFilter").value;
    const statusFilter = document.getElementById("testStatusFilter").value;

    const filtered = appState.tests.filter(t => {
        const matchQuery = t.name.toLowerCase().includes(query) || 
                           t.category.toLowerCase().includes(query) || 
                           (t.notes && t.notes.toLowerCase().includes(query));
        
        const matchDoc = !docFilter || t.doctorId === docFilter;
        const matchCat = !catFilter || t.category === catFilter;
        
        let matchStatus = true;
        if (statusFilter === "completed") matchStatus = t.status === "completed";
        if (statusFilter === "pending") matchStatus = t.status === "pending";

        return matchQuery && matchDoc && matchCat && matchStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i data-lucide="clipboard-list"></i>
                <p>No tests found matching filters.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(t => {
        const doc = appState.doctors.find(d => d.id === t.doctorId);
        const docName = doc ? doc.name : "Unknown Doctor";
        
        const isCompleted = t.status === "completed";
        const statusBadge = isCompleted ? '<span class="badge badge-completed">Completed</span>' : '<span class="badge badge-pending">Pending</span>';
        
        // Detect if out of range
        let isOutOfRange = false;
        let outOfRangeBadge = "";
        if (isCompleted && t.resultValue && t.referenceRange) {
            isOutOfRange = checkIfResultIsOutOfRange(t.resultValue, t.referenceRange);
            if (isOutOfRange) {
                outOfRangeBadge = `<span class="out-of-range-alert"><i data-lucide="alert-octagon" style="width:12px; height:12px;"></i> High/Low</span>`;
            }
        }

        const card = document.createElement("div");
        card.className = "card-item";
        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-title-group">
                        <h3 class="${isOutOfRange ? 'out-of-range' : ''}">${escapeHTML(t.name)}</h3>
                        <span class="doc-badge"><i data-lucide="user"></i> Prescribed by: ${escapeHTML(docName)}</span>
                    </div>
                    <div>
                        ${statusBadge}
                    </div>
                </div>
                
                <div class="card-details-list">
                    <div class="card-detail">
                        <span class="label">Category</span>
                        <span class="value" style="font-weight: 600;">${escapeHTML(t.category)}</span>
                    </div>
                    
                    ${isCompleted ? `
                    <div class="card-detail">
                        <span class="label">Measured Result</span>
                        <div class="result-value-display">
                            <span class="result-val ${isOutOfRange ? 'out-of-range' : ''}">${escapeHTML(t.resultValue)}</span>
                            <span class="result-unit">${escapeHTML(t.resultUnit)}</span>
                            ${outOfRangeBadge}
                        </div>
                    </div>
                    <div class="card-detail">
                        <span class="label">Reference Normal Range</span>
                        <span class="value">${escapeHTML(t.referenceRange)}</span>
                    </div>
                    <div class="card-detail">
                        <span class="label">Date Performed</span>
                        <span class="value">${formatFriendlyDate(new Date(t.datePerformed))}</span>
                    </div>
                    ` : `
                    <div class="card-detail">
                        <span class="label">Date Prescribed</span>
                        <span class="value">${formatFriendlyDate(new Date(t.datePrescribed))}</span>
                    </div>
                    <div class="card-detail" style="margin-top: 0.5rem;">
                        <button class="btn btn-secondary btn-sm" onclick="markTestAsCompletedModal('${t.id}')">
                            <i data-lucide="check-circle"></i> Input Results
                        </button>
                    </div>
                    `}
                    ${t.attachmentDataUrl ? `
                    <div class="card-detail" style="margin-top: 0.5rem;">
                        <button class="attachment-badge-btn" onclick="showAttachmentPreview('${t.id}')">
                            <i data-lucide="paperclip"></i>
                            <span>View: ${escapeHTML(t.attachmentName)}</span>
                        </button>
                    </div>` : ''}
                    
                    ${t.notes ? `
                    <div class="card-detail" style="margin-top: 0.5rem; background: rgba(255,255,255,0.02); padding: 0.5rem; border-radius: 4px; border-left: 3px solid var(--text-muted);">
                        <span class="label">Remarks</span>
                        <span class="value" style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(t.notes)}</span>
                    </div>` : ''}
                </div>
            </div>

            <div class="card-actions">
                <button class="btn btn-icon btn-edit" title="Edit Test Record" onclick="editTest('${t.id}')">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn btn-icon btn-delete" title="Delete Test Record" onclick="deleteTest('${t.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}

function toggleTestResultFields() {
    const status = document.getElementById("testStatus").value;
    const resultFields = document.getElementById("testResultFields");
    
    // Get fields
    const datePerformed = document.getElementById("testDatePerformed");
    const resultValue = document.getElementById("testValue");
    const resultUnit = document.getElementById("testUnit");
    
    if (status === "completed") {
        resultFields.classList.remove("hidden");
        datePerformed.required = true;
        resultValue.required = true;
        resultUnit.required = true;
        
        // Auto-fill dates if empty
        if (!datePerformed.value) {
            datePerformed.value = getLocalDateString(new Date());
        }
    } else {
        resultFields.classList.add("hidden");
        datePerformed.required = false;
        resultValue.required = false;
        resultUnit.required = false;
    }
}

function handleTestFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
        alert("File size exceeds 1.5MB. Please choose a smaller image or PDF file to avoid storage capacity limit.");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById("testAttachmentDataUrl").value = e.target.result;
        document.getElementById("testAttachmentName").value = file.name;
        document.getElementById("testReportFileName").innerText = file.name;
        document.getElementById("clearTestFileBtn").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

function clearTestFileSelection() {
    document.getElementById("testReportFile").value = "";
    document.getElementById("testAttachmentDataUrl").value = "";
    document.getElementById("testAttachmentName").value = "";
    document.getElementById("testReportFileName").innerText = "No file selected";
    const clearBtn = document.getElementById("clearTestFileBtn");
    if (clearBtn) clearBtn.classList.add("hidden");
}

function openTestModal(editT = null) {
    if (appState.doctors.length === 0) {
        alert("Please add a doctor in the Doctors Directory tab first before logging lab tests.");
        switchTab("doctors");
        return;
    }

    populateDoctorSelects();
    const modalForm = document.getElementById("testForm");
    modalForm.reset();
    
    // Reset file select inputs
    clearTestFileSelection();
    
    if (editT) {
        document.getElementById("testModalTitle").innerText = "Edit Test Result";
        document.getElementById("testId").value = editT.id;
        document.getElementById("testName").value = editT.name;
        document.getElementById("testDoctorId").value = editT.doctorId;
        document.getElementById("testCategory").value = editT.category;
        document.getElementById("testDatePrescribed").value = editT.datePrescribed;
        document.getElementById("testStatus").value = editT.status;
        
        toggleTestResultFields();
        
        if (editT.status === "completed") {
            document.getElementById("testDatePerformed").value = editT.datePerformed;
            document.getElementById("testValue").value = editT.resultValue;
            document.getElementById("testUnit").value = editT.resultUnit;
            document.getElementById("testRefRange").value = editT.referenceRange || "";
        }
        
        document.getElementById("testNotes").value = editT.notes || "";
        
        // Re-populate attachments
        if (editT.attachmentDataUrl && editT.attachmentName) {
            document.getElementById("testAttachmentDataUrl").value = editT.attachmentDataUrl;
            document.getElementById("testAttachmentName").value = editT.attachmentName;
            document.getElementById("testReportFileName").innerText = editT.attachmentName;
            const clearBtn = document.getElementById("clearTestFileBtn");
            if (clearBtn) clearBtn.classList.remove("hidden");
        }
        
        currentEditId = editT.id;
        currentEditType = "test";
    } else {
        document.getElementById("testModalTitle").innerText = "Add Test Result";
        document.getElementById("testId").value = "";
        document.getElementById("testDatePrescribed").value = getLocalDateString(new Date());
        document.getElementById("testStatus").value = "completed";
        toggleTestResultFields();
        
        currentEditId = null;
        currentEditType = null;
    }
    
    openModal("testModal");
}

function markTestAsCompletedModal(id) {
    const t = appState.tests.find(x => x.id === id);
    if (t) {
        openTestModal(t);
        document.getElementById("testStatus").value = "completed";
        toggleTestResultFields();
    }
}

function saveTest(event) {
    event.preventDefault();
    
    const testId = document.getElementById("testId").value;
    const name = document.getElementById("testName").value.trim();
    const doctorId = document.getElementById("testDoctorId").value;
    const category = document.getElementById("testCategory").value.trim();
    const datePrescribed = document.getElementById("testDatePrescribed").value;
    const status = document.getElementById("testStatus").value;
    const notes = document.getElementById("testNotes").value.trim();
    
    const attachmentDataUrl = document.getElementById("testAttachmentDataUrl").value;
    const attachmentName = document.getElementById("testAttachmentName").value;
    
    let datePerformed = "";
    let resultValue = "";
    let resultUnit = "";
    let referenceRange = "";
    
    if (status === "completed") {
        datePerformed = document.getElementById("testDatePerformed").value;
        resultValue = document.getElementById("testValue").value.trim();
        resultUnit = document.getElementById("testUnit").value.trim();
        referenceRange = document.getElementById("testRefRange").value.trim();
    }
    
    if (testId) {
        const index = appState.tests.findIndex(x => x.id === testId);
        if (index !== -1) {
            appState.tests[index] = {
                id: testId, name, doctorId, category, datePrescribed,
                status, datePerformed, resultValue, resultUnit, referenceRange, notes,
                attachmentDataUrl, attachmentName
            };
        }
    } else {
        const newTest = {
            id: "test-" + Date.now(),
            name, doctorId, category, datePrescribed,
            status, datePerformed, resultValue, resultUnit, referenceRange, notes,
            attachmentDataUrl, attachmentName
        };
        appState.tests.push(newTest);
    }
    
    saveStateToLocalStorage();
    closeModal("testModal");
    renderTests();
    renderDashboardStats();
}

function editTest(id) {
    const t = appState.tests.find(x => x.id === id);
    if (t) {
        openTestModal(t);
    }
}

function deleteTest(id) {
    if (confirm("Are you sure you want to delete this lab test record?")) {
        appState.tests = appState.tests.filter(x => x.id !== id);
        saveStateToLocalStorage();
        renderTests();
        renderDashboardStats();
    }
}

// Logic to check if lab result falls outside normal reference values
function checkIfResultIsOutOfRange(valStr, refStr) {
    // Attempt to extract numbers from result and reference bounds
    const val = parseFloat(valStr);
    if (isNaN(val)) return false; // not a numeric result
    
    // Find all numbers in the reference range string (e.g. "4.0 - 5.6" or "< 5.7" or "10 - 20")
    const matches = refStr.match(/(\d+(\.\d+)?)/g);
    if (!matches || matches.length === 0) return false;
    
    const parsedRefs = matches.map(m => parseFloat(m));
    
    if (refStr.includes("<")) {
        // Less than operator check
        return val >= parsedRefs[0];
    }
    if (refStr.includes(">")) {
        // Greater than check
        return val <= parsedRefs[0];
    }
    
    if (parsedRefs.length >= 2) {
        // Range check [lower, upper]
        const lower = Math.min(parsedRefs[0], parsedRefs[1]);
        const upper = Math.max(parsedRefs[0], parsedRefs[1]);
        return val < lower || val > upper;
    }
    
    return false;
}

/* ==========================================================================
   MEDICAL HISTORY SUB-TAB CRUD
   ========================================================================== */

if (document.getElementById("historySearch")) {
    document.getElementById("historySearch").addEventListener("input", renderHistory);
    document.getElementById("historyStatusFilter").addEventListener("change", renderHistory);
}

function renderHistory() {
    const container = document.getElementById("historyContainer");
    if (!container) return;

    container.innerHTML = "";

    const query = document.getElementById("historySearch").value.toLowerCase().trim();
    const statusFilter = document.getElementById("historyStatusFilter").value;

    const filtered = appState.history.filter(h => {
        const matchQuery = h.condition.toLowerCase().includes(query) || 
                           (h.notes && h.notes.toLowerCase().includes(query));
        
        let matchStatus = true;
        if (statusFilter === "active") matchStatus = h.status === "active";
        if (statusFilter === "resolved") matchStatus = h.status === "resolved";

        return matchQuery && matchStatus;
    });

    // Sort history by date descending
    filtered.sort((a,b) => new Date(b.diagnosedDate) - new Date(a.diagnosedDate));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="history"></i>
                <p>No history entries found matching filters.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(h => {
        const doc = appState.doctors.find(d => d.id === h.doctorId);
        const docText = doc ? `Managed by ${doc.name} (${doc.specialty})` : "Self-Managed / Primary";
        
        const isResolved = h.status === "resolved";
        const statusBadge = isResolved ? '<span class="badge" style="background: rgba(16,185,129,0.08); color: var(--success-color); border: 1px solid rgba(16,185,129,0.2);">Resolved</span>' : '<span class="badge badge-active">Ongoing</span>';

        const item = document.createElement("div");
        item.className = `timeline-item ${isResolved ? 'resolved' : ''}`;
        item.innerHTML = `
            <div class="timeline-node"></div>
            
            <div class="timeline-header">
                <div class="timeline-title-group">
                    <h3>${escapeHTML(h.condition)}</h3>
                    ${statusBadge}
                </div>
                <span class="timeline-date"><i data-lucide="calendar" style="width:12px; height:12px; display:inline; margin-right:4px;"></i>${formatFriendlyDate(new Date(h.diagnosedDate))}</span>
            </div>
            
            <div class="timeline-body">
                <p>${escapeHTML(h.notes)}</p>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="user-check" style="width:12px; height:12px;"></i>
                    <span>${escapeHTML(docText)}</span>
                </div>
            </div>

            <div class="card-actions" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                <button class="btn btn-icon btn-edit" title="Edit Entry" onclick="editHistory('${h.id}')">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn btn-icon btn-delete" title="Delete Entry" onclick="deleteHistory('${h.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });

    lucide.createIcons();
}

function openHistoryModal(editH = null) {
    populateDoctorSelects();
    const modalForm = document.getElementById("historyForm");
    modalForm.reset();
    
    if (editH) {
        document.getElementById("historyModalTitle").innerText = "Edit History Entry";
        document.getElementById("historyId").value = editH.id;
        document.getElementById("histCondition").value = editH.condition;
        document.getElementById("histDate").value = editH.diagnosedDate;
        document.getElementById("histStatus").value = editH.status;
        document.getElementById("histDoctorId").value = editH.doctorId || "";
        document.getElementById("histNotes").value = editH.notes || "";
        
        currentEditId = editH.id;
        currentEditType = "history";
    } else {
        document.getElementById("historyModalTitle").innerText = "Add History Entry";
        document.getElementById("historyId").value = "";
        document.getElementById("histDate").value = getLocalDateString(new Date());
        document.getElementById("histStatus").value = "active";
        
        currentEditId = null;
        currentEditType = null;
    }
    
    openModal("historyModal");
}

function saveHistory(event) {
    event.preventDefault();
    
    const histId = document.getElementById("historyId").value;
    const condition = document.getElementById("histCondition").value.trim();
    const diagnosedDate = document.getElementById("histDate").value;
    const status = document.getElementById("histStatus").value;
    const doctorId = document.getElementById("histDoctorId").value || "";
    const notes = document.getElementById("histNotes").value.trim();
    
    if (histId) {
        const index = appState.history.findIndex(x => x.id === histId);
        if (index !== -1) {
            appState.history[index] = {
                id: histId, condition, diagnosedDate, status, doctorId, notes
            };
        }
    } else {
        const newHist = {
            id: "hist-" + Date.now(),
            condition, diagnosedDate, status, doctorId, notes
        };
        appState.history.push(newHist);
    }
    
    saveStateToLocalStorage();
    closeModal("historyModal");
    renderHistory();
    renderDashboardStats();
}

function editHistory(id) {
    const h = appState.history.find(x => x.id === id);
    if (h) {
        openHistoryModal(h);
    }
}

function deleteHistory(id) {
    if (confirm("Are you sure you want to delete this medical history entry?")) {
        appState.history = appState.history.filter(x => x.id !== id);
        saveStateToLocalStorage();
        renderHistory();
        renderDashboardStats();
    }
}

/* ==========================================================================
   DOCTORS DIRECTORY CRUD
   ========================================================================== */

if (document.getElementById("doctorSearch")) {
    document.getElementById("doctorSearch").addEventListener("input", renderDoctors);
}

function renderDoctors() {
    const container = document.getElementById("doctorsContainer");
    if (!container) return;

    container.innerHTML = "";

    const query = document.getElementById("doctorSearch").value.toLowerCase().trim();

    const filtered = appState.doctors.filter(d => {
        return d.name.toLowerCase().includes(query) || 
               d.specialty.toLowerCase().includes(query) || 
               (d.hospital && d.hospital.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i data-lucide="users"></i>
                <p>No doctors found matching query.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(d => {
        // Count prescriptions managed by this doctor
        const rxCount = appState.prescriptions.filter(rx => rx.doctorId === d.id && rx.active).length;
        const testCount = appState.tests.filter(t => t.doctorId === d.id).length;

        const card = document.createElement("div");
        card.className = "card-item";
        card.innerHTML = `
            <div>
                <div class="doctor-avatar-circle">
                    <i data-lucide="user"></i>
                </div>
                
                <h3 style="font-size: 1.25rem; color: #fff; margin-bottom: 0.25rem;">${escapeHTML(d.name)}</h3>
                <span class="doc-badge" style="margin-bottom: 0.75rem;">${escapeHTML(d.specialty)}</span>
                
                <div class="card-details-list" style="margin-top: 0.5rem;">
                    ${d.hospital ? `
                    <div class="card-detail">
                        <span class="label">Hospital Affiliation</span>
                        <span class="value">${escapeHTML(d.hospital)}</span>
                    </div>` : ''}
                    
                    <div class="doctor-contact-list">
                        ${d.phone ? `
                        <a href="tel:${d.phone}" class="contact-link">
                            <i data-lucide="phone"></i>
                            <span>${escapeHTML(d.phone)}</span>
                        </a>` : ''}
                        
                        ${d.email ? `
                        <a href="mailto:${d.email}" class="contact-link">
                            <i data-lucide="mail"></i>
                            <span>${escapeHTML(d.email)}</span>
                        </a>` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem; background: rgba(255,255,255,0.02); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">
                    <div style="flex:1; text-align:center;">
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-hover);">${rxCount}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Active Meds</div>
                    </div>
                    <div style="width: 1px; background: var(--panel-border);"></div>
                    <div style="flex:1; text-align:center;">
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--secondary-hover);">${testCount}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Total Tests</div>
                    </div>
                </div>
            </div>

            <div class="card-actions" style="margin-top: 1rem;">
                <button class="btn btn-icon btn-edit" title="Edit Doctor Profile" onclick="editDoctor('${d.id}')">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn btn-icon btn-delete" title="Delete Doctor Profile" onclick="deleteDoctor('${d.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}

function openDoctorModal(editD = null) {
    const modalForm = document.getElementById("doctorForm");
    modalForm.reset();
    
    if (editD) {
        document.getElementById("doctorModalTitle").innerText = "Edit Doctor Profile";
        document.getElementById("doctorId").value = editD.id;
        document.getElementById("docName").value = editD.name;
        document.getElementById("docSpecialty").value = editD.specialty;
        document.getElementById("docHospital").value = editD.hospital || "";
        document.getElementById("docPhone").value = editD.phone || "";
        document.getElementById("docEmail").value = editD.email || "";
        
        currentEditId = editD.id;
        currentEditType = "doctor";
    } else {
        document.getElementById("doctorModalTitle").innerText = "Add New Doctor";
        document.getElementById("doctorId").value = "";
        
        currentEditId = null;
        currentEditType = null;
    }
    
    openModal("doctorModal");
}

function saveDoctor(event) {
    event.preventDefault();
    
    const docId = document.getElementById("doctorId").value;
    const name = document.getElementById("docName").value.trim();
    const specialty = document.getElementById("docSpecialty").value.trim();
    const hospital = document.getElementById("docHospital").value.trim();
    const phone = document.getElementById("docPhone").value.trim();
    const email = document.getElementById("docEmail").value.trim();
    
    if (docId) {
        const index = appState.doctors.findIndex(d => d.id === docId);
        if (index !== -1) {
            appState.doctors[index] = {
                id: docId, name, specialty, hospital, phone, email
            };
        }
    } else {
        const newDoc = {
            id: "doc-" + Date.now(),
            name, specialty, hospital, phone, email
        };
        appState.doctors.push(newDoc);
    }
    
    saveStateToLocalStorage();
    closeModal("doctorModal");
    renderDoctors();
    populateDoctorSelects();
    renderDashboardStats();
}

function editDoctor(id) {
    const doc = appState.doctors.find(d => d.id === id);
    if (doc) {
        openDoctorModal(doc);
    }
}

function deleteDoctor(id) {
    // Check constraints: has prescriptions or tests linked?
    const hasRxs = appState.prescriptions.some(rx => rx.doctorId === id);
    const hasTests = appState.tests.some(t => t.doctorId === id);
    
    if (hasRxs || hasTests) {
        alert("Cannot delete this doctor because they have active prescriptions or tests assigned. Please reassign those records first before removing the doctor.");
        return;
    }
    
    if (confirm("Are you sure you want to delete this doctor profile?")) {
        appState.doctors = appState.doctors.filter(d => d.id !== id);
        saveStateToLocalStorage();
        renderDoctors();
        populateDoctorSelects();
        renderDashboardStats();
    }
}

/* ==========================================================================
   PATIENT PROFILE MANAGEMENT
   ========================================================================== */

function openProfileModal() {
    const patient = appState.patient;
    document.getElementById("editName").value = patient.name;
    document.getElementById("editDob").value = patient.dob;
    document.getElementById("editBloodGroup").value = patient.bloodGroup;
    document.getElementById("editPhone").value = patient.phone;
    document.getElementById("editAllergies").value = patient.allergies || "";
    document.getElementById("editEmergencyContact").value = patient.emergencyContact;
    
    openModal("profileModal");
}

function saveProfile(event) {
    event.preventDefault();
    
    appState.patient = {
        name: document.getElementById("editName").value.trim(),
        dob: document.getElementById("editDob").value,
        bloodGroup: document.getElementById("editBloodGroup").value,
        phone: document.getElementById("editPhone").value.trim(),
        allergies: document.getElementById("editAllergies").value.trim(),
        emergencyContact: document.getElementById("editEmergencyContact").value.trim()
    };
    
    saveStateToLocalStorage();
    closeModal("profileModal");
    renderProfileCard();
}

/* ==========================================================================
   CHARTS AND ANALYTICS RENDERING (CHART.JS)
   ========================================================================== */

function populateChartBiomarkersDropdown() {
    const dropdown = document.getElementById("chartTestType");
    if (!dropdown) return;
    
    // Find all unique names of tests that are completed and have numerical values
    const numericTestNames = [...new Set(
        appState.tests
            .filter(t => t.status === "completed" && !isNaN(parseFloat(t.resultValue)))
            .map(t => t.name)
    )];
    
    const currentValue = dropdown.value;
    dropdown.innerHTML = "";
    
    if (numericTestNames.length === 0) {
        dropdown.innerHTML = `<option value="">No Numeric Tests Available</option>`;
        return;
    }
    
    numericTestNames.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        dropdown.appendChild(opt);
    });
    
    // Maintain value if still available
    if (numericTestNames.includes(currentValue)) {
        dropdown.value = currentValue;
    } else {
        dropdown.value = numericTestNames[0] || "";
    }
}

function renderCharts() {
    renderTrendsChart();
    renderRxDoctorChart();
    renderTestCategoryChart();
}

// 1. Line Chart: Test trends over time for chosen metric
function renderTrendsChart() {
    const canvas = document.getElementById("testTrendsChart");
    if (!canvas) return;
    
    const chosenMetric = document.getElementById("chartTestType").value;
    
    if (trendsChartInstance) {
        trendsChartInstance.destroy();
    }
    
    if (!chosenMetric) {
        // Render empty chart visual or handle nicely
        return;
    }
    
    // Filter and sort chosen tests by date performed
    const sortedTests = appState.tests
        .filter(t => t.status === "completed" && t.name === chosenMetric && !isNaN(parseFloat(t.resultValue)))
        .sort((a, b) => new Date(a.datePerformed) - new Date(b.datePerformed));
        
    const labels = sortedTests.map(t => formatFriendlyDate(new Date(t.datePerformed), true));
    const dataPoints = sortedTests.map(t => parseFloat(t.resultValue));
    const unit = sortedTests[0] ? sortedTests[0].resultUnit : "";
    
    // Parse normal ranges bounds
    let lowerBound = null;
    let upperBound = null;
    if (sortedTests[0] && sortedTests[0].referenceRange) {
        const refStr = sortedTests[0].referenceRange;
        const matches = refStr.match(/(\d+(\.\d+)?)/g);
        if (matches) {
            const parsedRefs = matches.map(m => parseFloat(m));
            if (refStr.includes("<")) {
                upperBound = parsedRefs[0];
            } else if (refStr.includes(">")) {
                lowerBound = parsedRefs[0];
            } else if (parsedRefs.length >= 2) {
                lowerBound = Math.min(parsedRefs[0], parsedRefs[1]);
                upperBound = Math.max(parsedRefs[0], parsedRefs[1]);
            }
        }
    }
    
    const ctx = canvas.getContext("2d");
    
    // Generate horizontal reference lines if range parsed
    const annotationData = [];
    const pluginsConfig = {};
    
    trendsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${chosenMetric} (${unit})`,
                data: dataPoints,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#fff',
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#06b6d4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Inter' }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: { family: 'Inter' }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#f3f4f6',
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#151829',
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    fontFamily: 'Inter',
                    callbacks: {
                        label: function(context) {
                            return ` Result: ${context.parsed.y} ${unit}`;
                        }
                    }
                }
            }
        }
    });
}

// 2. Bar Chart: Active prescriptions counted by managing doctors
function renderRxDoctorChart() {
    const canvas = document.getElementById("rxPerDoctorChart");
    if (!canvas) return;

    if (rxDoctorChartInstance) {
        rxDoctorChartInstance.destroy();
    }

    const dataMap = {};
    appState.doctors.forEach(d => {
        dataMap[d.name] = 0;
    });

    appState.prescriptions.forEach(rx => {
        if (rx.active) {
            const doc = appState.doctors.find(d => d.id === rx.doctorId);
            if (doc) {
                dataMap[doc.name] = (dataMap[doc.name] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(dataMap);
    const dataPoints = Object.values(dataMap);

    const ctx = canvas.getContext("2d");
    rxDoctorChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Active Prescriptions',
                data: dataPoints,
                backgroundColor: 'rgba(139, 92, 246, 0.75)',
                borderColor: '#8b5cf6',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#9ca3af',
                        stepSize: 1
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 3. Doughnut Chart: Distribution of tests categorized
function renderTestCategoryChart() {
    const canvas = document.getElementById("testCategoryChart");
    if (!canvas) return;

    if (testCategoryChartInstance) {
        testCategoryChartInstance.destroy();
    }

    const catMap = {};
    appState.tests.forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + 1;
    });

    const labels = Object.keys(catMap);
    const dataPoints = Object.values(catMap);

    // Standard beautiful colors
    const colors = [
        'rgba(6, 182, 212, 0.75)', // Cyan
        'rgba(139, 92, 246, 0.75)', // Purple
        'rgba(59, 130, 246, 0.75)', // Blue
        'rgba(16, 185, 129, 0.75)', // Green
        'rgba(245, 158, 11, 0.75)', // Amber
        'rgba(239, 68, 68, 0.75)'  // Red
    ];
    const borderColors = [
        '#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'
    ];

    const ctx = canvas.getContext("2d");
    testCategoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: borderColors.slice(0, labels.length),
                borderWidth: 1.5,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        padding: 15,
                        font: { family: 'Outfit', size: 11 }
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   MODAL UTILITIES
   ========================================================================== */

function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
    
    // Clear references on close
    currentEditId = null;
    currentEditType = null;
}

// Close modal when clicking backdrop
window.onclick = function(event) {
    if (event.target.classList.contains("modal-backdrop")) {
        closeModal(event.target.id);
    }
};

/* ==========================================================================
   DATE HELPER FUNCTIONS
   ========================================================================== */

// Convert Date object to YYYY-MM-DD local format
function getLocalDateString(dateObj) {
    const d = new Date(dateObj);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

// Format date to human friendly form: "Jun 26, 2026"
function formatFriendlyDate(dateObj, shortMonth = false) {
    const options = { 
        year: 'numeric', 
        month: shortMonth ? 'short' : 'long', 
        day: 'numeric' 
    };
    return dateObj.toLocaleDateString('en-US', options);
}
// Escape HTML for XSS prevention
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/* ==========================================================================
   LAB TEST ATTACHMENT LIGHTBOX PREVIEW
   ========================================================================== */

function showAttachmentPreview(testId) {
    const t = appState.tests.find(x => x.id === testId);
    if (!t || !t.attachmentDataUrl) return;

    const container = document.getElementById("attachmentPreviewContainer");
    if (!container) return;

    container.innerHTML = "";

    const dataUrl = t.attachmentDataUrl;
    const name = t.attachmentName || "Attachment";

    // Determine preview method based on mime type
    if (dataUrl.startsWith("data:application/pdf")) {
        container.innerHTML = `
            <iframe src="${dataUrl}" width="100%" height="450px" style="border: none; border-radius: 6px; background: #fff;"></iframe>
        `;
    } else if (dataUrl.startsWith("data:image/")) {
        container.innerHTML = `
            <img src="${dataUrl}" alt="${escapeHTML(name)}" style="max-width:100%; max-height:55vh; object-fit:contain; border-radius:6px; border:1px solid var(--panel-border);">
        `;
    } else {
        container.innerHTML = `
            <div class="pdf-preview-fallback">
                <i data-lucide="file-text" style="width: 48px; height: 48px; color: var(--primary-hover); margin-bottom: 1rem;"></i>
                <p>Preview not supported for: <strong>${escapeHTML(name)}</strong></p>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">Please download and view it locally.</p>
            </div>
        `;
        lucide.createIcons();
    }

    // Update download button properties
    const downloadBtn = document.getElementById("downloadAttachmentBtn");
    if (downloadBtn) {
        downloadBtn.href = dataUrl;
        downloadBtn.download = name;
    }

    // Update lightbox header title
    const previewTitle = document.getElementById("attachmentPreviewTitle");
    if (previewTitle) {
        previewTitle.innerText = `View: ${name}`;
    }

    openModal("attachmentPreviewModal");
}

/* ==========================================================================
   DATA CENTER - CSV SYNC (TEMPLATES, EXPORT, IMPORT, RESET)
   ========================================================================== */

// Helper to escape CSV cell contents
function escapeCSVValue(val) {
    if (val === undefined || val === null) return "";
    let str = String(val).trim();
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    }
    return str;
}

// 1. Download CSV templates
function downloadTemplate(type) {
    let csvContent = "";
    let filename = "";
    
    if (type === "doctors") {
        csvContent = "Doctor Name,Specialty,Hospital Affiliation,Phone Number,Email Address\n";
        csvContent += "Dr. Sarah Rahman,Endocrinologist,Square Hospital,+880 1712-345678,sarah.rahman@hospital.com\n";
        csvContent += "Dr. Zahid Hasan,Cardiologist,National Heart Institute,+880 1711-223344,zahid.hasan@heart.org\n";
        filename = "doctors_template.csv";
    } else if (type === "prescriptions") {
        csvContent = "Medicine Name,Doctor Name,Dosage,Start Date (YYYY-MM-DD),Schedule Type (continuous/fixed_period/interval),End Date (YYYY-MM-DD),Interval Value (number),Interval Unit (days/weeks/months),Instructions,Active (true/false)\n";
        csvContent += "Metformin 500mg,Dr. Sarah Rahman,1 tablet after breakfast & dinner,2026-07-04,continuous,,,,Take with warm water,true\n";
        csvContent += "Atorvastatin 10mg,Dr. Zahid Hasan,1 tablet before sleep,2026-07-04,fixed_period,2026-10-04,,,Avoid grapefruit,true\n";
        filename = "medicines_template.csv";
    } else if (type === "tests") {
        csvContent = "Test Name,Doctor Name,Category,Date Prescribed (YYYY-MM-DD),Status (completed/pending),Date Performed (YYYY-MM-DD),Result Value,Unit,Reference Range,Notes\n";
        csvContent += "Fasting Blood Sugar (FBS),Dr. Sarah Rahman,Blood,2026-07-01,completed,2026-07-02,5.8,mmol/L,4.0 - 5.6 mmol/L,10 hours fasting required. High.\n";
        csvContent += "Lipid Profile,Dr. Zahid Hasan,Cardiology,2026-07-04,pending,,,,,,Fasting required for 12 hours\n";
        filename = "tests_template.csv";
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 2. Export current appState data as CSV
function exportData(type) {
    let csvContent = "";
    let filename = "";
    
    if (type === "doctors") {
        csvContent = "Doctor Name,Specialty,Hospital Affiliation,Phone Number,Email Address\n";
        appState.doctors.forEach(d => {
            csvContent += `${escapeCSVValue(d.name)},${escapeCSVValue(d.specialty)},${escapeCSVValue(d.hospital)},${escapeCSVValue(d.phone)},${escapeCSVValue(d.email)}\n`;
        });
        filename = `exported_doctors_${getLocalDateString(new Date())}.csv`;
    } else if (type === "prescriptions") {
        csvContent = "Medicine Name,Doctor Name,Dosage,Start Date (YYYY-MM-DD),Schedule Type,End Date (YYYY-MM-DD),Interval Value,Interval Unit,Instructions,Active (true/false)\n";
        appState.prescriptions.forEach(rx => {
            const doc = appState.doctors.find(d => d.id === rx.doctorId);
            const docName = doc ? doc.name : "";
            csvContent += `${escapeCSVValue(rx.medicineName)},${escapeCSVValue(docName)},${escapeCSVValue(rx.dosage)},${escapeCSVValue(rx.startDate)},${escapeCSVValue(rx.scheduleType)},${escapeCSVValue(rx.endDate)},${escapeCSVValue(rx.intervalValue)},${escapeCSVValue(rx.intervalUnit)},${escapeCSVValue(rx.instructions)},${escapeCSVValue(rx.active)}\n`;
        });
        filename = `exported_prescriptions_${getLocalDateString(new Date())}.csv`;
    } else if (type === "tests") {
        csvContent = "Test Name,Doctor Name,Category,Date Prescribed (YYYY-MM-DD),Status,Date Performed (YYYY-MM-DD),Result Value,Unit,Reference Range,Notes\n";
        appState.tests.forEach(t => {
            const doc = appState.doctors.find(d => d.id === t.doctorId);
            const docName = doc ? doc.name : "";
            csvContent += `${escapeCSVValue(t.name)},${escapeCSVValue(docName)},${escapeCSVValue(t.category)},${escapeCSVValue(t.datePrescribed)},${escapeCSVValue(t.status)},${escapeCSVValue(t.datePerformed)},${escapeCSVValue(t.resultValue)},${escapeCSVValue(t.resultUnit)},${escapeCSVValue(t.referenceRange)},${escapeCSVValue(t.notes)}\n`;
        });
        filename = `exported_tests_${getLocalDateString(new Date())}.csv`;
    }
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 3. Robust client-side CSV parser
function parseCSV(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i+1];
        
        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') {
                i++; // skip LF
            }
            lines.push(row);
            row = [''];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== '') {
        lines.push(row);
    }
    return lines;
}

// 4. File input listener for CSV selection
function handleCSVFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const type = document.getElementById("importDataType").value;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const text = e.target.result;
        importCSVData(type, text);
        input.value = ""; // Clear input for future selections
    };
    reader.readAsText(file);
}

// 5. CSV data processor and merging engine
function importCSVData(type, csvText) {
    const statusBox = document.getElementById("importStatus");
    if (!statusBox) return;

    try {
        const rows = parseCSV(csvText);
        if (rows.length < 2) {
            throw new Error("The CSV file has no records to import.");
        }
        
        // Lowercase clean headers
        const headers = rows[0].map(h => h.trim().toLowerCase());
        let importCount = 0;
        let updateCount = 0;

        if (type === "doctors") {
            const nameIdx = headers.findIndex(h => h.includes("name"));
            const specIdx = headers.findIndex(h => h.includes("specialty") || h.includes("spec"));
            const hospIdx = headers.findIndex(h => h.includes("hospital") || h.includes("clinic") || h.includes("affil"));
            const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("tel") || h.includes("contact"));
            const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
            
            if (nameIdx === -1) {
                throw new Error("Unable to locate 'Doctor Name' column in CSV headers.");
            }
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length <= nameIdx) continue;
                
                const name = row[nameIdx] ? row[nameIdx].trim() : "";
                if (!name) continue; // Skip empty rows
                
                const specialty = (specIdx !== -1 && row[specIdx]) ? row[specIdx].trim() : "General Practitioner";
                const hospital = (hospIdx !== -1 && row[hospIdx]) ? row[hospIdx].trim() : "";
                const phone = (phoneIdx !== -1 && row[phoneIdx]) ? row[phoneIdx].trim() : "";
                const email = (emailIdx !== -1 && row[emailIdx]) ? row[emailIdx].trim() : "";
                
                // Merge policy: match exact doctor name
                let existingDoc = appState.doctors.find(d => d.name.toLowerCase() === name.toLowerCase());
                if (existingDoc) {
                    existingDoc.specialty = specialty;
                    existingDoc.hospital = hospital;
                    existingDoc.phone = phone;
                    existingDoc.email = email;
                    updateCount++;
                } else {
                    const newDoc = {
                        id: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                        name, specialty, hospital, phone, email
                    };
                    appState.doctors.push(newDoc);
                    importCount++;
                }
            }
            statusBox.innerText = `Doctors synced successfully. Added ${importCount} new doctor profiles, updated ${updateCount} existing.`;

        } else if (type === "prescriptions") {
            const medNameIdx = headers.findIndex(h => h.includes("medicine") || h.includes("med name"));
            const docNameIdx = headers.findIndex(h => h.includes("doctor"));
            const dosageIdx = headers.findIndex(h => h.includes("dosage") || h.includes("dose"));
            const startIdx = headers.findIndex(h => h.includes("start"));
            const typeIdx = headers.findIndex(h => h.includes("type") || h.includes("schedule"));
            const endIdx = headers.findIndex(h => h.includes("end"));
            const valIdx = headers.findIndex(h => h.includes("value") || h.includes("every"));
            const unitIdx = headers.findIndex(h => h.includes("unit"));
            const instIdx = headers.findIndex(h => h.includes("instruction") || h.includes("special"));
            const activeIdx = headers.findIndex(h => h.includes("active"));
            
            if (medNameIdx === -1) {
                throw new Error("Unable to locate 'Medicine Name' column in CSV headers.");
            }
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length <= medNameIdx) continue;
                
                const medicineName = row[medNameIdx] ? row[medNameIdx].trim() : "";
                if (!medicineName) continue;
                
                // Doctor matching/auto-creation
                let doctorId = "";
                const docNameVal = (docNameIdx !== -1 && row[docNameIdx]) ? row[docNameIdx].trim() : "";
                if (docNameVal) {
                    let doc = appState.doctors.find(d => d.name.toLowerCase() === docNameVal.toLowerCase());
                    if (!doc) {
                        // Create default doctor profile
                        doc = {
                            id: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                            name: docNameVal,
                            specialty: "General Medicine",
                            hospital: "Imported Affiliation",
                            phone: "",
                            email: ""
                        };
                        appState.doctors.push(doc);
                    }
                    doctorId = doc.id;
                } else {
                    // Fail-safe doctor if not specified
                    if (appState.doctors.length > 0) {
                        doctorId = appState.doctors[0].id;
                    } else {
                        // Create standard doctor
                        const doc = {
                            id: "doc-default",
                            name: "House Doctor",
                            specialty: "General Medicine",
                            hospital: "", phone: "", email: ""
                        };
                        appState.doctors.push(doc);
                        doctorId = doc.id;
                    }
                }
                
                const dosage = (dosageIdx !== -1 && row[dosageIdx]) ? row[dosageIdx].trim() : "1 dose";
                const startDate = (startIdx !== -1 && row[startIdx]) ? row[startIdx].trim() : getLocalDateString(new Date());
                const scheduleType = (typeIdx !== -1 && row[typeIdx]) ? row[typeIdx].trim().toLowerCase() : "continuous";
                const endDate = (endIdx !== -1 && row[endIdx]) ? row[endIdx].trim() : "";
                const intervalValue = (valIdx !== -1 && row[valIdx]) ? parseInt(row[valIdx].trim(), 10) || 1 : 1;
                const intervalUnit = (unitIdx !== -1 && row[unitIdx]) ? row[unitIdx].trim().toLowerCase() : "days";
                const instructions = (instIdx !== -1 && row[instIdx]) ? row[instIdx].trim() : "";
                const active = (activeIdx !== -1 && row[activeIdx]) ? (row[activeIdx].trim().toLowerCase() === "true" || row[activeIdx].trim() === "1") : true;
                
                // Add prescription
                const newRx = {
                    id: "rx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                    medicineName, doctorId, dosage, startDate, scheduleType, endDate, intervalValue, intervalUnit, instructions, active
                };
                appState.prescriptions.push(newRx);
                importCount++;
            }
            statusBox.innerText = `Medicines imported successfully. Added ${importCount} new prescription records.`;

        } else if (type === "tests") {
            const nameIdx = headers.findIndex(h => h.includes("test name") || h.includes("test"));
            const docNameIdx = headers.findIndex(h => h.includes("doctor"));
            const catIdx = headers.findIndex(h => h.includes("category") || h.includes("dept"));
            const presIdx = headers.findIndex(h => h.includes("prescribed"));
            const statusIdx = headers.findIndex(h => h.includes("status"));
            const perfIdx = headers.findIndex(h => h.includes("performed") || h.includes("done"));
            const valIdx = headers.findIndex(h => h.includes("value") || h.includes("result"));
            const unitIdx = headers.findIndex(h => h.includes("unit"));
            const refIdx = headers.findIndex(h => h.includes("reference") || h.includes("range") || h.includes("normal"));
            const noteIdx = headers.findIndex(h => h.includes("note") || h.includes("remark"));
            
            if (nameIdx === -1) {
                throw new Error("Unable to locate 'Test Name' column in CSV headers.");
            }
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length <= nameIdx) continue;
                
                const name = row[nameIdx] ? row[nameIdx].trim() : "";
                if (!name) continue;
                
                // Doctor matching
                let doctorId = "";
                const docNameVal = (docNameIdx !== -1 && row[docNameIdx]) ? row[docNameIdx].trim() : "";
                if (docNameVal) {
                    let doc = appState.doctors.find(d => d.name.toLowerCase() === docNameVal.toLowerCase());
                    if (!doc) {
                        doc = {
                            id: "doc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                            name: docNameVal,
                            specialty: "General Medicine",
                            hospital: "Imported Affiliation",
                            phone: "", email: ""
                        };
                        appState.doctors.push(doc);
                    }
                    doctorId = doc.id;
                } else {
                    if (appState.doctors.length > 0) {
                        doctorId = appState.doctors[0].id;
                    } else {
                        const doc = {
                            id: "doc-default",
                            name: "House Doctor",
                            specialty: "General Medicine",
                            hospital: "", phone: "", email: ""
                        };
                        appState.doctors.push(doc);
                        doctorId = doc.id;
                    }
                }
                
                const category = (catIdx !== -1 && row[catIdx]) ? row[catIdx].trim() : "General";
                const datePrescribed = (presIdx !== -1 && row[presIdx]) ? row[presIdx].trim() : getLocalDateString(new Date());
                const status = (statusIdx !== -1 && row[statusIdx]) ? row[statusIdx].trim().toLowerCase() : "completed";
                const datePerformed = (perfIdx !== -1 && row[perfIdx]) ? row[perfIdx].trim() : "";
                const resultValue = (valIdx !== -1 && row[valIdx]) ? row[valIdx].trim() : "";
                const resultUnit = (unitIdx !== -1 && row[unitIdx]) ? row[unitIdx].trim() : "";
                const referenceRange = (refIdx !== -1 && row[refIdx]) ? row[refIdx].trim() : "";
                const notes = (noteIdx !== -1 && row[noteIdx]) ? row[noteIdx].trim() : "";
                
                const newTest = {
                    id: "test-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                    name, doctorId, category, datePrescribed, status, datePerformed, resultValue, resultUnit, referenceRange, notes
                };
                appState.tests.push(newTest);
                importCount++;
            }
            statusBox.innerText = `Tests imported successfully. Added ${importCount} new lab test records.`;
        }
        
        // Save and refresh
        saveStateToLocalStorage();
        renderAll();
        
        statusBox.className = "import-status-box import-status-success";
    } catch (err) {
        console.error("CSV Import error:", err);
        statusBox.innerText = `Import failed: ${err.message}`;
        statusBox.className = "import-status-box import-status-error";
    }
}

// 6. Reset database
function resetDatabaseToDefault() {
    if (confirm("Are you sure you want to restore default mock records? This will delete all custom changes!")) {
        localStorage.removeItem("my_health_tracker_data");
        loadData();
        renderAll();
        alert("Database reset successfully to original demo state.");
        switchTab("dashboard");
    }
}

