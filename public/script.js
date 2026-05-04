const API = "/api";
let transactions = [];
let debts = [];
let chart;

function showForgotPassword() {
  document
    .querySelectorAll(".auth-form")
    .forEach((form) => form.classList.add("hidden"));
  document.getElementById("forgotPasswordForm").classList.remove("hidden");
  setAuthMessage("");
}

function showResendVerification() {
  document
    .querySelectorAll(".auth-form")
    .forEach((form) => form.classList.add("hidden"));
  document.getElementById("resendVerificationForm").classList.remove("hidden");
  setAuthMessage("");
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function getToken() {
  return localStorage.getItem("financeToken");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("financeUser"));
  } catch {
    return null;
  }
}

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function switchAuth(type) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".auth-form")
    .forEach((form) => form.classList.add("hidden"));

  if (type === "login") {
    document.querySelector(".tab-btn:first-child").classList.add("active");
    document.getElementById("loginForm").classList.remove("hidden");
  } else {
    document.querySelector(".tab-btn:last-child").classList.add("active");
    document.getElementById("registerForm").classList.remove("hidden");
  }
}

function setAuthMessage(message, isSuccess = false) {
  const el = document.getElementById("authMessage");
  if (!el) return;

  el.textContent = message;
  el.style.color = isSuccess ? "#16a34a" : "#dc2626";

  // auto hide after 4s
  setTimeout(() => {
    el.textContent = "";
  }, 4000);
}

function saveAuth(data) {
  localStorage.setItem("financeToken", data.token);
  localStorage.setItem("financeUser", JSON.stringify(data.user));
  window.location.href = "/dashboard";
}

function logout() {
  localStorage.removeItem("financeToken");
  localStorage.removeItem("financeUser");
  window.location.href = "/";
}

function requireAuth() {
  if (location.pathname.includes("dashboard") && !getToken()) {
    window.location.href = "/";
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) sidebar.classList.toggle("show");
}

function closeModals() {
  document
    .querySelectorAll(".modal")
    .forEach((modal) => modal.classList.add("hidden"));
}

function openModal(id, type = "") {
  closeModals();
  const modal = document.getElementById(id);
  modal.classList.remove("hidden");

  if (id === "transactionModal") {
    document.getElementById("transactionForm").reset();
    document.getElementById("transactionId").value = "";
    document.getElementById("transactionType").value = type;
    document.getElementById("transactionModalTitle").textContent =
      `Add ${capitalize(type)}`;
    document.getElementById("transactionDate").valueAsDate = new Date();
  }

  if (id === "debtModal") {
    document.getElementById("debtForm").reset();
    document.getElementById("debtId").value = "";
    document.getElementById("debtType").value = type;
    document.getElementById("debtModalTitle").textContent =
      type === "i_owe" ? "Add Debt I Owe" : "Add Person Who Owes Me";
    document.getElementById("debtNameLabel").textContent =
      type === "i_owe" ? "Creditor Name" : "Borrower Name";
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-PH");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

const MONTHLY_BUDGET = 10000;
const SAVINGS_GOAL = 25000;

function renderAdvancedAnalytics() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyExpenses = 0;
  let totalSavings = 0;
  const categories = {};

  transactions.forEach((t) => {
    const date = new Date(t.date);
    const amount = Number(t.amount) || 0;

    if (t.type === "savings") {
      totalSavings += amount;
    }

    if (
      t.type === "expense" &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    ) {
      monthlyExpenses += amount;

      const category = t.category || "General";
      categories[category] = (categories[category] || 0) + amount;
    }
  });

  renderBudget(monthlyExpenses);
  renderCategorySpending(categories, monthlyExpenses);
  renderSavingsGoal(totalSavings);
  renderFinancialInsights(monthlyExpenses, totalSavings);
}

function renderBudget(monthlyExpenses) {
  const percent = Math.min((monthlyExpenses / MONTHLY_BUDGET) * 100, 100);

  setText(
    "budgetUsedText",
    `${peso.format(monthlyExpenses)} / ${peso.format(MONTHLY_BUDGET)}`,
  );

  setText("budgetPercentText", `${percent.toFixed(0)}% used`);

  const bar = document.getElementById("budgetProgress");
  if (bar) {
    bar.style.width = `${percent}%`;

    if (percent > 80) {
      bar.style.background = "#ef4444"; // red
    } else if (percent > 50) {
      bar.style.background = "#f59e0b"; // orange
    } else {
      bar.style.background = "#0b63f6"; // blue
    }
  }
}

function renderCategorySpending(categories, monthlyExpenses) {
  const list = document.getElementById("categorySpendingList");
  if (!list) return;

  const entries = Object.entries(categories);

  if (!entries.length) {
    list.innerHTML = `<p class="muted">No expenses recorded this month.</p>`;
    return;
  }

  list.innerHTML = entries
    .map(([category, amount]) => {
      const percent = monthlyExpenses
        ? Math.min((amount / monthlyExpenses) * 100, 100)
        : 0;

      return `
        <div class="category-item">
          <div class="category-head">
            <strong>${category}</strong>
            <span>${peso.format(amount)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSavingsGoal(totalSavings) {
  const percent = Math.min((totalSavings / SAVINGS_GOAL) * 100, 100);

  setText(
    "savingsGoalText",
    `${peso.format(totalSavings)} / ${peso.format(SAVINGS_GOAL)}`,
  );

  setText("savingsPercentText", `${percent.toFixed(0)}% completed`);

  const bar = document.getElementById("savingsProgress");
  if (bar) bar.style.width = `${percent}%`;
}

function renderFinancialInsights(monthlyExpenses, totalSavings) {
  const box = document.getElementById("financialInsights");
  if (!box) return;

  let insights = [];

  if (monthlyExpenses > MONTHLY_BUDGET) {
    insights.push(`
      <div class="insight warning-insight">
        You exceeded your monthly budget. Consider reducing non-essential expenses.
      </div>
    `);
  } else {
    insights.push(`
      <div class="insight good-insight">
        You are still within your monthly budget. Good financial control.
      </div>
    `);
  }

  if (totalSavings < SAVINGS_GOAL * 0.25) {
    insights.push(`
      <div class="insight warning-insight">
        Your savings progress is still low. Try saving a fixed amount every week.
      </div>
    `);
  } else {
    insights.push(`
      <div class="insight good-insight">
        Your savings goal is progressing well. Keep your saving habit consistent.
      </div>
    `);
  }

  if (monthlyExpenses > 0) {
    insights.push(`
      <div class="insight">
        Your total spending this month is ${peso.format(monthlyExpenses)}.
      </div>
    `);
  }

  box.innerHTML = insights.join("");
}

async function loadDashboard() {
  if (!document.getElementById("totalIncome")) return;

  const user = getUser();
  if (user)
    document.getElementById("userGreeting").textContent =
      `Welcome back, ${user.name}`;

  const data = await request(`${API}/finance/summary`);
  const s = data.summary;

  setText("totalIncome", peso.format(s.totalIncome));
  setText("totalExpenses", peso.format(s.totalExpenses));
  setText("currentBalance", peso.format(s.currentBalance));
  setText("totalSavings", peso.format(s.totalSavings));
  setText("totalDebtsIOwe", peso.format(s.totalDebtsIOwe));
  setText("totalOwedToMe", peso.format(s.totalOwedToMe));
  setText("netWorth", peso.format(s.netWorth));

  renderChart(data.monthlyChart);
  renderReminders(data.reminders);
}

function renderChart(monthlyChart) {
  const ctx = document.getElementById("incomeExpenseChart");
  if (!ctx) return;

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthlyChart.map((item) => item.month),
      datasets: [
        { label: "Income", data: monthlyChart.map((item) => item.income) },
        { label: "Expenses", data: monthlyChart.map((item) => item.expense) },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderReminders(reminders) {
  const list = document.getElementById("remindersList");
  if (!list) return;

  if (!reminders.length) {
    list.innerHTML =
      '<p class="muted">No debts due within the next 7 days.</p>';
    return;
  }

  list.innerHTML = reminders
    .map(
      (item) => `
    <div class="reminder-item">
      <strong>${item.name}</strong><br>
      Due: ${formatDate(item.dueDate)}<br>
      Remaining: ${peso.format(item.amountBorrowed - item.amountPaid)}
    </div>
  `,
    )
    .join("");
}

async function loadTransactions() {
  if (!document.getElementById("transactionList")) return;

  const data = await request(`${API}/finance/transactions`);
  transactions = data.transactions;

  renderTransactions();
  renderAdvancedAnalytics();
}

function renderTransactions() {
  const list = document.getElementById("transactionList");
  if (!list) return;

  list.innerHTML =
    transactions
      .slice(0, 8)
      .map((t) => {
        let icon = "-";
        let colorClass = "red";
        let bgClass = "tx-expense";
        let sign = "-";

        if (t.type === "income") {
          icon = "+";
          colorClass = "green";
          bgClass = "tx-income";
          sign = "+";
        }

        if (t.type === "savings") {
          icon = "💰";
          colorClass = "green";
          bgClass = "tx-income";
          sign = "+";
        }

        return `
          <div class="transaction-item">
            <div class="tx-icon ${bgClass}">
              ${icon}
            </div>
            <div>
              <strong>${t.title}</strong>
              <p>${formatDate(t.date)}</p>
            </div>
            <strong class="${colorClass}">
              ${sign}${peso.format(t.amount)}
            </strong>
          </div>
        `;
      })
      .join("") || "<p>No transactions yet</p>";
}

function editTransaction(t) {
  openModal("transactionModal", t.type);
  document.getElementById("transactionId").value = t._id;
  document.getElementById("transactionTitle").value = t.title;
  document.getElementById("transactionAmount").value = t.amount;
  document.getElementById("transactionCategory").value = t.category || "";
  document.getElementById("transactionDate").value = t.date
    ? new Date(t.date).toISOString().slice(0, 10)
    : "";
  document.getElementById("transactionNotes").value = t.notes || "";
  document.getElementById("transactionModalTitle").textContent =
    `Edit ${capitalize(t.type)}`;
}

async function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  await request(`${API}/finance/transactions/${id}`, { method: "DELETE" });
  await refreshAll();
}

async function loadDebts() {
  if (!document.getElementById("debtsTable")) return;
  const type = document.getElementById("debtTypeFilter").value;
  const status = document.getElementById("debtStatusFilter").value;
  const search = document.getElementById("debtSearch").value;
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (status) params.append("status", status);
  if (search) params.append("search", search);

  const data = await request(`${API}/finance/debts?${params.toString()}`);
  debts = data.debts;
  renderDebts();
}

function renderDebts() {
  const tbody = document.getElementById("debtsTable");
  if (!tbody) return;

  tbody.innerHTML =
    debts
      .map((d) => {
        const remaining = Math.max(d.amountBorrowed - d.amountPaid, 0);
        const badgeClass = d.status === "partially paid" ? "partial" : d.status;
        return `
      <tr>
        <td>${d.debtType === "i_owe" ? "I Owe" : "Owes Me"}</td>
        <td>${d.name}</td>
        <td>${d.contactNumber || "-"}</td>
        <td>${peso.format(d.amountBorrowed)}</td>
        <td>${peso.format(d.amountPaid)}</td>
        <td>${peso.format(remaining)}</td>
        <td>${formatDate(d.dueDate)}</td>
        <td><span class="badge ${badgeClass}">${d.status}</span></td>
        <td>
          <div class="actions">
            <button class="small-btn pay-btn" onclick="openPayment('${d._id}')">Pay</button>
            <button class="small-btn" onclick='editDebt(${JSON.stringify(d)})'>Edit</button>
            <button class="small-btn delete-btn" onclick="deleteDebt('${d._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
      })
      .join("") || '<tr><td colspan="9">No debts yet.</td></tr>';
}

function editDebt(d) {
  openModal("debtModal", d.debtType);
  document.getElementById("debtId").value = d._id;
  document.getElementById("debtName").value = d.name;
  document.getElementById("debtContact").value = d.contactNumber || "";
  document.getElementById("debtBorrowed").value = d.amountBorrowed;
  document.getElementById("debtPaid").value = d.amountPaid;
  document.getElementById("debtDueDate").value = d.dueDate
    ? new Date(d.dueDate).toISOString().slice(0, 10)
    : "";
  document.getElementById("debtNotes").value = d.notes || "";
}

function openPayment(id) {
  closeModals();
  document.getElementById("paymentForm").reset();
  document.getElementById("paymentDebtId").value = id;
  document.getElementById("paymentDate").valueAsDate = new Date();
  document.getElementById("paymentModal").classList.remove("hidden");
}

async function deleteDebt(id) {
  if (!confirm("Delete this debt record?")) return;
  await request(`${API}/finance/debts/${id}`, { method: "DELETE" });
  await refreshAll();
}

async function refreshAll() {
  await loadDashboard();
  await loadTransactions();
  await loadDebts();
}

function toggleProfileMenu(e) {
  e.stopPropagation(); // prevents instant closing

  const menu = document.getElementById("profileDropdown");
  if (menu) menu.classList.toggle("hidden");
}
document.addEventListener("click", (e) => {
  const profileMenu = document.querySelector(".profile-menu");
  const dropdown = document.getElementById("profileDropdown");

  if (!profileMenu || !dropdown) return;

  if (!profileMenu.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

document.addEventListener("click", (e) => {
  const profileMenu = document.querySelector(".profile-menu");
  const dropdown = document.getElementById("profileDropdown");

  if (!profileMenu || !dropdown) return;

  if (!profileMenu.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

function loadProfileMenu() {
  const user = getUser();
  if (!user) return;

  // Dropdown
  setText("profileName", user.name || "User");
  setText("profileEmail", user.email || "");

  // Profile page
  setText("profileNamePage", user.name || "User");
  setText("profileEmailPage", user.email || "");
}

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function showTab(tabId) {
  document.querySelectorAll(".app-tab").forEach((tab) => {
    tab.classList.remove("active-tab");
  });

  const selected = document.getElementById(tabId);
  if (selected) selected.classList.add("active-tab");
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();

  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const data = await request(`${API}/auth/forgot-password`, {
          method: "POST",
          body: JSON.stringify({
            email: document.getElementById("forgotEmail").value,
          }),
        });

        setAuthMessage(data.message, true);
        switchAuth("login");
      } catch (error) {
        setAuthMessage(error.message);
      }
    });
  }

  const resendVerificationForm = document.getElementById(
    "resendVerificationForm",
  );
  if (resendVerificationForm) {
    resendVerificationForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const data = await request(`${API}/auth/resend-verification`, {
          method: "POST",
          body: JSON.stringify({
            email: document.getElementById("resendEmail").value,
          }),
        });

        setAuthMessage(data.message, true);
        switchAuth("login");
      } catch (error) {
        setAuthMessage(error.message);
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btn = loginForm.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Logging in...";

      try {
        const data = await request(`${API}/auth/login`, {
          method: "POST",
          body: JSON.stringify({
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value,
          }),
        });

        if (data.token) {
          saveAuth(data);
        } else {
          setAuthMessage(data.message);
        }
      } catch (error) {
        setAuthMessage(error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Login";
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btn = registerForm.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Creating...";

      try {
        const data = await request(`${API}/auth/register`, {
          method: "POST",
          body: JSON.stringify({
            name: document.getElementById("registerName").value,
            email: document.getElementById("registerEmail").value,
            password: document.getElementById("registerPassword").value,
          }),
        });

        setAuthMessage(data.message, true);
        switchAuth("login");
      } catch (error) {
        setAuthMessage(error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Register";
      }
    });
  }

  const transactionForm = document.getElementById("transactionForm");
  if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("transactionId").value;
      const payload = {
        type: document.getElementById("transactionType").value,
        title: document.getElementById("transactionTitle").value,
        amount: Number(document.getElementById("transactionAmount").value),
        category: document.getElementById("transactionCategory").value,
        date: document.getElementById("transactionDate").value,
        notes: document.getElementById("transactionNotes").value,
      };

      await request(`${API}/finance/transactions${id ? "/" + id : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModals();
      await refreshAll();
    });
  }

  const debtForm = document.getElementById("debtForm");
  if (debtForm) {
    debtForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("debtId").value;
      const payload = {
        debtType: document.getElementById("debtType").value,
        name: document.getElementById("debtName").value,
        contactNumber: document.getElementById("debtContact").value,
        amountBorrowed: Number(document.getElementById("debtBorrowed").value),
        amountPaid: Number(document.getElementById("debtPaid").value || 0),
        dueDate: document.getElementById("debtDueDate").value,
        notes: document.getElementById("debtNotes").value,
      };

      await request(`${API}/finance/debts${id ? "/" + id : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModals();
      await refreshAll();
    });
  }

  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("paymentDebtId").value;
      await request(`${API}/finance/debts/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(document.getElementById("paymentAmount").value),
          date: document.getElementById("paymentDate").value,
          notes: document.getElementById("paymentNotes").value,
        }),
      });
      closeModals();
      await refreshAll();
    });
  }

  if (location.pathname.includes("dashboard")) {
    loadProfileMenu();
    refreshAll().catch((error) => alert(error.message));
  }

  const profileForm = document.getElementById("profileForm");

  if (profileForm) {
    const user = getUser();

    if (user) {
      document.getElementById("editProfileName").value = user.name || "";
      document.getElementById("editProfileEmail").value = user.email || "";
    }

    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const data = await request(`${API}/auth/profile`, {
          method: "PUT",
          body: JSON.stringify({
            name: document.getElementById("editProfileName").value,
            email: document.getElementById("editProfileEmail").value,
          }),
        });

        localStorage.setItem("financeUser", JSON.stringify(data.user));
        loadProfileMenu();

        alert("Profile updated successfully.");
      } catch (error) {
        alert(error.message);
      }
    });
  }

  const changePasswordForm = document.getElementById("changePasswordForm");

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match.");
        return;
      }

      try {
        await request(`${API}/auth/change-password`, {
          method: "PUT",
          body: JSON.stringify({
            currentPassword: document.getElementById("currentPassword").value,
            newPassword,
          }),
        });

        changePasswordForm.reset();
        alert("Password changed successfully.");
      } catch (error) {
        alert(error.message);
      }
    });
  }
});
