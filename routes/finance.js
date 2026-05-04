const express = require("express");
const Transaction = require("../models/Transaction");
const Debt = require("../models/Debt");
const protect = require("./middleware");

const router = express.Router();
router.use(protect);

function computeStatus(amountBorrowed, amountPaid) {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= amountBorrowed) return "paid";
  return "partially paid";
}

router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.find({ user: userId });
    const debts = await Debt.find({ user: userId }).sort({ dueDate: 1 });

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalSavings = transactions
      .filter((t) => t.type === "savings")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalDebtsIOwe = debts
      .filter((d) => d.debtType === "i_owe")
      .reduce((s, d) => s + Math.max(d.amountBorrowed - d.amountPaid, 0), 0);
    const totalOwedToMe = debts
      .filter((d) => d.debtType === "owes_me")
      .reduce((s, d) => s + Math.max(d.amountBorrowed - d.amountPaid, 0), 0);
    const currentBalance = totalIncome - totalExpenses - totalSavings;
    const netWorth =
      currentBalance + totalSavings + totalOwedToMe - totalDebtsIOwe;

    const monthly = {};
    transactions.forEach((t) => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!monthly[key]) monthly[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "income") monthly[key].income += t.amount;
      if (t.type === "expense") monthly[key].expense += t.amount;
    });

    const today = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(today.getDate() + 7);
    const reminders = debts.filter((d) => {
      if (!d.dueDate || d.status === "paid") return false;
      const due = new Date(d.dueDate);
      return due >= today && due <= nextSevenDays;
    });

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        currentBalance,
        totalSavings,
        totalDebtsIOwe,
        totalOwedToMe,
        netWorth,
      },
      monthlyChart: Object.values(monthly).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      reminders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({
      date: -1,
    });
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const transaction = await Transaction.create({
      ...req.body,
      user: req.user.id,
    });

    // Calculate updated balance
    const updatedBalance = calculateUpdatedBalance(); // Function to calculate current balance

    // Emit updated balance to all connected clients
    io.emit("balanceUpdated", updatedBalance); // Emit to all clients

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/transactions/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true },
    );
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/transactions/:id", async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/debts", async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = { user: req.user.id };
    if (type) filter.debtType = type;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };
    const debts = await Debt.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, debts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/debts", async (req, res) => {
  try {
    const amountBorrowed = Number(req.body.amountBorrowed || 0);
    const amountPaid = Number(req.body.amountPaid || 0);
    const debt = await Debt.create({
      ...req.body,
      user: req.user.id,
      amountBorrowed,
      amountPaid,
      status: computeStatus(amountBorrowed, amountPaid),
    });
    res.status(201).json({ success: true, debt });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/debts/:id", async (req, res) => {
  try {
    const existing = await Debt.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Debt not found" });

    Object.assign(existing, req.body);
    existing.amountBorrowed = Number(existing.amountBorrowed || 0);
    existing.amountPaid = Number(existing.amountPaid || 0);
    existing.status = computeStatus(
      existing.amountBorrowed,
      existing.amountPaid,
    );
    await existing.save();
    res.json({ success: true, debt: existing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/debts/:id/payments", async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user.id });
    if (!debt)
      return res
        .status(404)
        .json({ success: false, message: "Debt not found" });

    const amount = Number(req.body.amount || 0);
    if (amount <= 0)
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });

    debt.payments.push({
      amount,
      date: req.body.date || new Date(),
      notes: req.body.notes || "",
    });
    debt.amountPaid += amount;
    debt.status = computeStatus(debt.amountBorrowed, debt.amountPaid);
    await debt.save();

    res.json({ success: true, debt });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/debts/:id", async (req, res) => {
  try {
    const deleted = await Debt.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Debt not found" });
    res.json({ success: true, message: "Debt deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
