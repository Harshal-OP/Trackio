import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBudget extends Document {
  userId: Types.ObjectId;
  category: string;
  month: string;
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
BudgetSchema.index({ userId: 1, month: 1 });

export const Budget = mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);
