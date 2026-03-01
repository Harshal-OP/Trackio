import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
    userId: Types.ObjectId;
    amount: number;
    type: 'income' | 'expense';
    date: Date;
    category: string;
    label?: string;
    notes?: string;
    paymentMethod: string;
    isRecurring: boolean;
    description: string;
    icon?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: ['income', 'expense'], required: true },
        date: { type: Date, required: true, default: Date.now },
        category: { type: String, required: true },
        label: { type: String, default: '' },
        notes: { type: String, default: '' },
        paymentMethod: { type: String, required: true, default: 'Cash' },
        isRecurring: { type: Boolean, default: false },
        description: { type: String, required: true },
        icon: { type: String, default: 'receipt_long' },
    },
    { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
