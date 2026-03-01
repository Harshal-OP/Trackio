import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubscription extends Document {
    userId: Types.ObjectId;
    name: string;
    category: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'weekly';
    nextDueDate: Date;
    autopay: boolean;
    status: 'active' | 'paused' | 'cancelled';
    logo?: string;
    icon: string;
    color: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true },
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        frequency: { type: String, enum: ['monthly', 'yearly', 'weekly'], default: 'monthly' },
        nextDueDate: { type: Date, required: true },
        autopay: { type: Boolean, default: false },
        status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
        logo: { type: String, default: '' },
        icon: { type: String, default: 'credit_card' },
        color: { type: String, default: '#19e65e' },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, nextDueDate: 1 });

export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
