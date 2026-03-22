// =========================
// LOCAL STORAGE DATABASE
// =========================
const STORAGE_KEY = "ipt_demo_v1";
window.db = {
    accounts: [],
    departments: []
};

// Load from localStorage or seed initial data
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        window.db = JSON.parse(data);
    } else {
        // Seed admin + sample departments
        window.db = {
            accounts: [
                {
                    first: "Admin",
                    last: "User",
                    email: "admin@example.com",
                    password: "Password123!",
                    role: "admin",
                    verified: true
                }
            ],
            departments: [
                { id: 1, name: "Engineering" },
                { id: 2, name: "HR" }
            ],
            employees: [],
            requests: [],

            
        };
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// Remove any previously logged in user
localStorage.removeItem("logged_in_user");

loadFromStorage();

// =========================
// GLOBAL STATE
// =========================
let currentUser = null;
// Helper to call protected backend routes with the token
async function fetchProtected(url) {
    const token = sessionStorage.getItem("authToken");
    const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    return res.json();
}
// =========================
// AUTH STATE HANDLER
// =========================
function setAuthState(isAuth, user = null) {
    const body = document.body;
    const dropdownBtn = document.getElementById("nav-username");

    if (isAuth) {
        currentUser = user;

        body.classList.remove("not-authenticated");
        body.classList.add("authenticated");

        // Admin mode?
        if (user.role === "admin") {
            body.classList.add("is-admin");
        } else {
            body.classList.remove("is-admin");
        }

        // Set username button text dynamically
        dropdownBtn.textContent = `${user.first || user.email} ▼`;

        // Show/hide admin links dynamically
        document.querySelectorAll(".role-admin").forEach(link => {
            link.style.display = user.role === "admin" ? "block" : "none";
        });

    } else {
        currentUser = null;
        body.classList.add("not-authenticated");
        body.classList.remove("authenticated", "is-admin");

        dropdownBtn.textContent = ""; // clear username

        // hide all admin links
        document.querySelectorAll(".role-admin").forEach(link => {
            link.style.display = "none";
        });
    }
}

// =========================
// AUTO LOGIN
// =========================
function autoLogin() {
    const savedUser = localStorage.getItem("logged_in_user");
    if (!savedUser) return;

    try {
        const user = JSON.parse(savedUser);
        const dbUser = window.db.accounts.find(a => a.email === user.email);
        if (dbUser) {
            setAuthState(true, dbUser);
        } else {
            localStorage.removeItem("logged_in_user");
        }
    } catch (err) {
        console.error("Failed to parse logged_in_user:", err);
        localStorage.removeItem("logged_in_user");
    }
}

// =========================
// NAVIGATION & ROUTER
// =========================
function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    let hash = window.location.hash || "#/";
    let page = hash.replace("#/", "");

    if (page === "" || page === "/") {
        return navigateTo("/profile-page");
    }

    // Hide all pages
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    // Show the target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add("active");
    } else {
        document.getElementById("home-page").classList.add("active");
    }

    if (page === "profile") {
        renderProfile();
    }


    // PROTECTED PAGES
    const protectedPages = ["profile", "requests"];
    const adminPages = ["employees", "accounts", "departments"];

    // Redirect if not logged in
    if (!currentUser) {
        if (protectedPages.includes(page) || adminPages.includes(page)) {
            return navigateTo("/");
        }
    }

    // Non-admin blocking
    if (currentUser && currentUser.role !== "admin") {
    if (adminPages.includes(page)) {
        alert("⛔ Access Denied! You do not have permission to view this page.");
        return navigateTo("/");
    }
}
}

// =========================
// NAVBAR UPDATE
// =========================
function updateNavVisibility() {
    const isLogged = currentUser !== null;
    const isAdmin = isLogged && currentUser.role === "admin";

    document.querySelectorAll(".role-logged-in").forEach(el =>
        el.style.display = isLogged ? "flex" : "none"
    );

    document.querySelectorAll(".role-logged-out").forEach(el =>
        el.style.display = !isLogged ? "flex" : "none"
    );

    document.querySelectorAll(".role-admin").forEach(el =>
        el.style.display = isAdmin ? "flex" : "none"
    );
}


// =========================
// REGISTER
// =========================
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const first = document.getElementById("regFirst").value.trim();
    const last = document.getElementById("regLast").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;

    try {
        const res = await fetch("http://localhost:3000/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password, role: "user" })
        });
        const data = await res.json();

        if (data.message) {
            // Also save to local db for UI purposes
            const newUser = { first, last, email, password, role: "user", verified: true };
            window.db.accounts.push(newUser);
            saveToStorage();
            alert("Registered successfully! You can now log in.");
            navigateTo("/login");
        } else {
            alert("Registration failed: " + (data.error || "Unknown error"));
        }
    } catch (err) {
        alert("Cannot connect to backend. Make sure server.js is running!");
    }
});

// =========================
// EMAIL VERIFICATION
// =========================
document.getElementById("verifyBtn").addEventListener("click", function () {
    const email = localStorage.getItem("pending_verification");
    if (!email) return;

    let user = window.db.accounts.find(acc => acc.email === email);
    if (!user) return;

    user.verified = true;
    saveToStorage();
    localStorage.removeItem("pending_verification");

    alert("Email Verified! You may now login.");
    navigateTo("/login");
});

// =========================
// LOGIN
// =========================
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password })
        });
        const data = await res.json();

        if (data.token) {
            sessionStorage.setItem("authToken", data.token);
            sessionStorage.setItem("userRole", data.role);
            sessionStorage.setItem("username", data.username);

            // Find matching user in local db for UI rendering
            const user = window.db.accounts.find(acc => acc.email === email);
            if (user) {
                setAuthState(true, user);
            } else {
                // User exists on backend but not in local db — create a temp object
                setAuthState(true, {
                    first: data.username,
                    email: email,
                    role: data.role,
                    verified: true
                });
            }
            navigateTo("/profile");
        } else {
            alert("Login failed: " + (data.error || "Unknown error"));
        }
    } catch (err) {
        alert("Cannot connect to backend. Make sure server.js is running!");
    }
});

// =========================
// LOGOUT
// =========================
document.getElementById("logoutBtn").addEventListener("click", function () {
    setAuthState(false);
    navigateTo("/");
});

// =========================
// NAV DROPDOWN
// =========================
const dropdownBtn = document.getElementById("nav-username");
const dropdownMenu = document.getElementById("nav-dropdown-menu");

dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === "flex" ? "none" : "flex";
});

// Close dropdown if click outside
window.addEventListener("click", () => {
    dropdownMenu.style.display = "none";
});

// =========================
// INITIALIZE APP
// =========================
window.addEventListener("load", () => {
    autoLogin();          // restore login if any
    handleRouting();      // show correct page
    updateNavVisibility(); // update navbar
});

window.addEventListener("hashchange", () => {
    handleRouting();
    updateNavVisibility();
});
//MY PROFILE
function renderProfile() {
    if (!currentUser) return;

    const container = document.getElementById("profileContent");
    container.innerHTML = `
        <h2>${currentUser.firstName || currentUser.email} ${currentUser.lastName || ""}</h2>
        <table class="profile-table">
            <tr>
                <td class="label">Email:</td>
                <td class="value">${currentUser.email}</td>
            </tr>
            <tr>
                <td class="label">Role:</td>
                <td class="value">${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</td>
            </tr>
        </table>
        <button class="btn-edit-profile" id="editProfileBtn">Edit Profile</button>
    `;

    // Add click handler for Edit Profile
    document.getElementById("editProfileBtn").addEventListener("click", () => {
        alert("Edit Profile functionality is not implemented yet!");
    });
}


// Elements
// ======== Elements ========
const addEmpBtn = document.getElementById("addEmployeeBtn");
const empForm = document.getElementById("employeeForm");
const cancelEmpBtn = document.getElementById("cancelEmployee");
const employeesTable = document.getElementById("employeesTable").querySelector("tbody");
const empId = document.getElementById("empId");
const empEmail = document.getElementById("empEmail");
const empPosition = document.getElementById("empPosition");
const empDept = document.getElementById("empDept");
const empHireDate = document.getElementById("empHireDate");

// ======== Populate Departments ========
function populateDeptOptions() {
    empDept.innerHTML = `<option value="">Select Department</option>`;
    window.db.departments.forEach(d => {
        const option = document.createElement("option");
        option.value = d.name;
        option.textContent = d.name;
        empDept.appendChild(option);
    });
}
populateDeptOptions();

// ======== Render Employees Table ========
async function renderEmployees() {
  employeesTable.innerHTML = "";
  try {
    const data = await fetchProtected("http://localhost:3000/api/employees");
    if (!data || data.length === 0) {
      employeesTable.innerHTML = `<tr><td colspan="6" style="text-align:center;">No employees recorded yet.</td></tr>`;
      return;
    }
    data.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${emp.id}</td>
        <td>${emp.email}</td>
        <td>${emp.position}</td>
        <td>${emp.dept}</td>
        <td>${emp.hireDate}</td>
        <td>
          <button class="btn" onclick="editEmployee('${emp.id}')">Edit</button>
          <button class="btn" onclick="deleteEmployee('${emp.id}')">Delete</button>
        </td>`;
      employeesTable.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load employees:", err);
  }
}

// ======== Show/Hide Form ========
addEmpBtn.addEventListener("click", () => {
    empForm.style.display = empForm.style.display === "none" ? "block" : "none";
    empForm.reset();
    empHireDate.valueAsDate = new Date();
});

// ======== Cancel Form ========
cancelEmpBtn.addEventListener("click", () => {
    empForm.style.display = "none";
});

// ======== Form Submit ========

empForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const id = empId.value.trim();
  const email = empEmail.value.trim();
  const position = empPosition.value.trim();
  const dept = empDept.value;
  const hireDate = empHireDate.value;
  if (!id || !email || !position || !dept || !hireDate) return alert("All fields are required.");
  try {
    const existing = await fetchProtected("http://localhost:3000/api/employees");
    const found = existing.find(e => e.id === id);
    if (found) {
      await fetch(`http://localhost:3000/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ email, position, dept, hireDate })
      });
    } else {
      await fetch("http://localhost:3000/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
        },
        body: JSON.stringify({ id, email, position, dept, hireDate })
      });
    }
    empForm.style.display = "none";
    empForm.reset();
    renderEmployees();
  } catch (err) {
    alert("Failed to save employee.");
  }
});

// ======== Edit Employee ========
async function editEmployee(id) {
  const data = await fetchProtected("http://localhost:3000/api/employees");
  const emp = data.find(e => e.id === id);
  if (!emp) return;
  empId.value = emp.id;
  empEmail.value = emp.email;
  empPosition.value = emp.position;
  empDept.value = emp.dept;
  empHireDate.value = emp.hireDate;
  empForm.style.display = "block";
}

// ======== Delete Employee ========
async function deleteEmployee(id) {
  if (!confirm("Delete this employee?")) return;
  await fetch(`http://localhost:3000/api/employees/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${sessionStorage.getItem("authToken")}` }
  });
  renderEmployees();
}

// Department Elements
const addDeptBtn = document.getElementById("addDeptBtn");
const deptForm = document.getElementById("departmentForm");
const cancelDept = document.getElementById("cancelDept");

const deptName = document.getElementById("deptName");
const deptDescription = document.getElementById("deptDescription");

async function renderDepartments() {
  const tbody = document.querySelector("#departmentTableBody");
  tbody.innerHTML = "";
  try {
    const data = await fetchProtected("http://localhost:3000/api/departments");
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No departments yet.</td></tr>`;
      return;
    }
    data.forEach(dept => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dept.name}</td>
        <td>${dept.description}</td>
        <td>
          <div class="department-actions">
            <button class="edit-btn" onclick="editDepartment(${dept.id})">Edit</button>
            <button class="delete-btn" onclick="deleteDepartment(${dept.id})">Delete</button>
          </div>
        </td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load departments:", err);
  }
}
// Show form
addDeptBtn.addEventListener("click", () => {
    deptForm.style.display = "block";
    deptForm.reset();
});

// Hide form
cancelDept.addEventListener("click", () => {
    deptForm.style.display = "none";
});

// Render departments


// Handle Add/Edit Submit
deptForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = deptName.value.trim();
  const description = deptDescription.value.trim();
  if (!name || !description) return alert("All fields are required.");
  try {
    await fetch("http://localhost:3000/api/departments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
      },
      body: JSON.stringify({ name, description })
    });
    deptForm.style.display = "none";
    deptForm.reset();
    renderDepartments();
  } catch (err) {
    alert("Failed to save department.");
  }
});

// Edit Department
async function editDepartment(id) {
  const data = await fetchProtected("http://localhost:3000/api/departments");
  const dept = data.find(d => d.id === id);
  if (!dept) return;
  deptForm.style.display = "block";
  deptName.value = dept.name;
  deptDescription.value = dept.description;
  deptForm.onsubmit = async function (e) {
    e.preventDefault();
    await fetch(`http://localhost:3000/api/departments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
      },
      body: JSON.stringify({ 
        name: deptName.value.trim(), 
        description: deptDescription.value.trim() 
      })
    });
    deptForm.style.display = "none";
    deptForm.onsubmit = null;
    renderDepartments();
  };
}

// Delete Department
async function deleteDepartment(id) {
  if (!confirm("Delete this department?")) return;
  await fetch(`http://localhost:3000/api/departments/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${sessionStorage.getItem("authToken")}` }
  });
  renderDepartments();
}
// Load on page load
window.addEventListener("load", renderDepartments);


// ---- ACCOUNT ELEMENTS ----
const addAccountBtn = document.getElementById("addAccountBtn");
const accountForm = document.getElementById("accountForm");
const cancelAccount = document.getElementById("cancelAccount");

// Form fields
const accFirstName = document.getElementById("accFirstName");
const accLastName = document.getElementById("accLastName");
const accEmail = document.getElementById("accEmail");
const accPassword = document.getElementById("accPassword");
const accRole = document.getElementById("accRole");
const accVerified = document.getElementById("accVerified");

// Keep track of edit index
let editIndex = null;

// ---- SHOW ADD FORM ----
addAccountBtn.addEventListener("click", () => {
    editIndex = null; // New entry
    accountForm.reset();
    accountForm.style.display = "block";
});

// ---- CANCEL BUTTON ----
cancelAccount.addEventListener("click", () => {
    accountForm.style.display = "none";
    editIndex = null;
});

// ---- RENDER ACCOUNTS TABLE ----
function renderAccounts() {
    const tbody = document.querySelector("#accountsTable tbody");
    tbody.innerHTML = "";

    if (!window.db.accounts || window.db.accounts.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="5" style="text-align:center; padding:10px;">No accounts found.</td></tr>`;
        return;
    }

    window.db.accounts.forEach((acc, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td style="padding:10px;">${acc.firstName} ${acc.lastName}</td>
            <td style="padding:10px;">${acc.email}</td>
            <td style="padding:10px;">${acc.role}</td>
            <td style="padding:10px;">${acc.verified ? "✓" : ""}</td>
            <td style="padding:10px;">
                <button class="btn" onclick="editAccount(${index})">Edit</button>
                <button class="btn" onclick="resetPassword(${index})">Reset Password</button>
                <button class="btn" onclick="deleteAccount(${index})">Delete</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ---- SAVE ACCOUNT (ADD OR EDIT) ----
accountForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const acc = {
        firstName: accFirstName.value.trim(),
        lastName: accLastName.value.trim(),
        email: accEmail.value.trim(),
        password: accPassword.value.trim(),
        role: accRole.value,
        verified: accVerified.checked
    };

    if (!acc.firstName || !acc.lastName || !acc.email || !acc.password) {
        alert("All fields are required.");
        return;
    }

    if (editIndex !== null) {
        // UPDATE existing
        window.db.accounts[editIndex] = acc;
    } else {
        // ADD new
        window.db.accounts.push(acc);
    }

    saveToStorage();
    renderAccounts();

    accountForm.style.display = "none";
    editIndex = null;
});

// ---- EDIT ACCOUNT ----
function editAccount(index) {
    const acc = window.db.accounts[index];
    editIndex = index;

    accFirstName.value = acc.firstName;
    accLastName.value = acc.lastName;
    accEmail.value = acc.email;
    accPassword.value = acc.password;
    accRole.value = acc.role;
    accVerified.checked = acc.verified;

    accountForm.style.display = "block";
}

// ---- DELETE ACCOUNT ----
function deleteAccount(index) {
    if (!confirm("Delete this account?")) return;

    window.db.accounts.splice(index, 1);
    saveToStorage();
    renderAccounts();
}

// ---- RESET PASSWORD ----
function resetPassword(index) {
    const newPass = prompt("Enter new password:");
    if (!newPass) return;

    window.db.accounts[index].password = newPass;

    saveToStorage();
    alert("Password updated!");
}

// ---- LOAD ON PAGE START ----
window.addEventListener("load", () => {
    if (!window.db.accounts) window.db.accounts = [];
    renderAccounts();
});


document.getElementById("addAccountBtn").addEventListener("click", function () {
    document.getElementById("accountForm").style.display = "block";
});

document.getElementById("cancelAccount").addEventListener("click", function () {
    document.getElementById("accountForm").style.display = "none";
});


// ====== Elements ======
const reqType = document.getElementById("reqType");
const fieldsContainer = document.getElementById("requestFieldsContainer");
const requestModal = document.getElementById("requestModal");
const newRequestBtn = document.getElementById("newRequestBtn");
const closeRequestModal = document.getElementById("closeRequestModal");

// Open modal
newRequestBtn.addEventListener("click", () => {
    requestModal.style.display = "flex";

    // Optionally select a default type (e.g., Leave)
    reqType.value = "leave";
    renderFields(reqType.value);
});

// Close modal
closeRequestModal.addEventListener("click", () => {
    requestModal.style.display = "none";
    requestForm.reset();
    fieldsContainer.innerHTML = "";
});

// Render fields based on type
function renderFields(type) {
    fieldsContainer.innerHTML = "";

    if (type === "leave") {
        fieldsContainer.innerHTML = `
            <label>Start Date</label>
            <input type="date" id="leaveStartDate" class="input" required>
            <label>End Date</label>
            <input type="date" id="leaveEndDate" class="input" required>
            <label>Reason</label>
            <textarea id="leaveReason" class="input" placeholder="Reason for leave" required></textarea>
        `;
    } else if (type === "item") {
        fieldsContainer.innerHTML = `
            <div id="itemList">
                <label>Item 1</label>
                <input type="text" class="request-item input" placeholder="Item name" required>
            </div>
            <button type="button" id="addItemBtn" class="btn success" style="margin-top:5px;">+ Add Item</button>
        `;

        const addItemBtn = document.getElementById("addItemBtn");
        const itemList = document.getElementById("itemList");

        addItemBtn.addEventListener("click", () => {
            const count = itemList.querySelectorAll(".request-item").length + 1;
            const input = document.createElement("input");
            input.type = "text";
            input.className = "request-item input";
            input.placeholder = `Item ${count}`;
            input.required = true;
            itemList.appendChild(input);
        });
    }
}

// Update fields whenever type changes
reqType.addEventListener("change", () => {
    renderFields(reqType.value);
});

// Handle form submission
document.getElementById("requestForm").addEventListener("submit", (e) => {
    e.preventDefault();

    let requestData = { type: reqType.value };

    if (reqType.value === "leave") {
        requestData.startDate = document.getElementById("leaveStartDate").value;
        requestData.endDate = document.getElementById("leaveEndDate").value;
        requestData.reason = document.getElementById("leaveReason").value;
    } else if (reqType.value === "item") {
        requestData.items = Array.from(document.querySelectorAll(".request-item")).map(input => input.value);
    }

    console.log("New Request Submitted:", requestData);

    // Optionally save to localStorage or your global db
    // window.db.requests.push(requestData);
    // saveToStorage();

    alert("Request submitted!");
    requestModal.style.display = "none";
    requestForm.reset();
    fieldsContainer.innerHTML = "";
});

const getStartedBtn = document.getElementById("getStartedBtn");
if (getStartedBtn) {
    getStartedBtn.addEventListener("click", () => {
        navigateTo("/register-page");
    });
}
