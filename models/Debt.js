const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const debtSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    debtType: { type: String, enum: ['i_owe', 'owes_me'], required: true },
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, default: '' },
    amountBorrowed: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['unpaid', 'partially paid', 'paid'], default: 'unpaid' },
    payments: [paymentSchema],
  },
  { timestamps: true }
);

debtSchema.virtual('remainingBalance').get(function () {
  return Math.max(this.amountBorrowed - this.amountPaid, 0);
});

debtSchema.set('toJSON', { virtuals: true });
debtSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Debt', debtSchema);
