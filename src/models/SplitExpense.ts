import mongoose, { Document, Schema, Types } from 'mongoose';

interface IExpenseShare {
  memberId: Types.ObjectId;
  amount: number;
}

export interface ISplitExpense extends Document {
  groupId: Types.ObjectId;
  paidByMemberId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  splitType: 'equal' | 'custom';
  splits: IExpenseShare[];
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseShareSchema = new Schema<IExpenseShare>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'SplitMember', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SplitExpenseSchema = new Schema<ISplitExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'SplitGroup', required: true, index: true },
    paidByMemberId: { type: Schema.Types.ObjectId, ref: 'SplitMember', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    description: { type: String, required: true, trim: true },
    splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
    splits: { type: [ExpenseShareSchema], required: true },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

SplitExpenseSchema.index({ groupId: 1, date: -1 });

export const SplitExpense =
  mongoose.models.SplitExpense || mongoose.model<ISplitExpense>('SplitExpense', SplitExpenseSchema);
