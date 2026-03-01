import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISplitSettlement extends Document {
  groupId: Types.ObjectId;
  payerMemberId: Types.ObjectId;
  receiverMemberId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SplitSettlementSchema = new Schema<ISplitSettlement>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'SplitGroup', required: true, index: true },
    payerMemberId: { type: Schema.Types.ObjectId, ref: 'SplitMember', required: true },
    receiverMemberId: { type: Schema.Types.ObjectId, ref: 'SplitMember', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

SplitSettlementSchema.index({ groupId: 1, date: -1 });

export const SplitSettlement =
  mongoose.models.SplitSettlement || mongoose.model<ISplitSettlement>('SplitSettlement', SplitSettlementSchema);
