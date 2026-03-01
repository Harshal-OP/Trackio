import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
    userId?: Types.ObjectId;
    name: string;
    icon: string;
    color: string;
    isDefault: boolean;
    createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        name: { type: String, required: true },
        icon: { type: String, required: true, default: 'category' },
        color: { type: String, required: true, default: '#94a3b8' },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

// Default categories to seed
export const DEFAULT_CATEGORIES = [
    { name: 'Food', icon: 'restaurant', color: '#f97316', isDefault: true },
    { name: 'Transport', icon: 'directions_car', color: '#3b82f6', isDefault: true },
    { name: 'Shopping', icon: 'shopping_bag', color: '#f97316', isDefault: true },
    { name: 'Entertainment', icon: 'movie', color: '#a855f7', isDefault: true },
    { name: 'Utilities', icon: 'bolt', color: '#06b6d4', isDefault: true },
    { name: 'Health', icon: 'fitness_center', color: '#ef4444', isDefault: true },
    { name: 'Travel', icon: 'flight', color: '#14b8a6', isDefault: true },
    { name: 'Rent', icon: 'home', color: '#8b5cf6', isDefault: true },
    { name: 'Groceries', icon: 'shopping_cart', color: '#f97316', isDefault: true },
    { name: 'Income', icon: 'payments', color: '#10b981', isDefault: true },
    { name: 'Salary', icon: 'account_balance', color: '#10b981', isDefault: true },
    { name: 'Gas', icon: 'local_gas_station', color: '#64748b', isDefault: true },
    { name: 'Software', icon: 'design_services', color: '#a855f7', isDefault: true },
    { name: 'Other', icon: 'category', color: '#94a3b8', isDefault: true },
];
