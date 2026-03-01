import mongoose, { Document, Schema, Types } from 'mongoose';

export type SplitActivityType =
  | 'GROUP_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_UPDATED'
  | 'MEMBER_REMOVED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'SETTLEMENT_CREATED'
  | 'INVITE_REGENERATED'
  | 'GROUP_UPDATED';

export interface ISplitActivity extends Document {
  groupId: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  actorMemberId?: Types.ObjectId;
  type: SplitActivityType;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SplitActivitySchema = new Schema<ISplitActivity>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'SplitGroup', required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorMemberId: { type: Schema.Types.ObjectId, ref: 'SplitMember', default: null },
    type: {
      type: String,
      required: true,
      enum: [
        'GROUP_CREATED',
        'MEMBER_ADDED',
        'MEMBER_UPDATED',
        'MEMBER_REMOVED',
        'EXPENSE_CREATED',
        'EXPENSE_UPDATED',
        'EXPENSE_DELETED',
        'SETTLEMENT_CREATED',
        'INVITE_REGENERATED',
        'GROUP_UPDATED',
      ],
    },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SplitActivitySchema.index({ groupId: 1, createdAt: -1 });

export const SplitActivity =
  mongoose.models.SplitActivity || mongoose.model<ISplitActivity>('SplitActivity', SplitActivitySchema);
