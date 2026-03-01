import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISplitMember extends Document {
  groupId: Types.ObjectId;
  userId?: Types.ObjectId;
  guestName?: string;
  email?: string;
  role: 'owner' | 'member';
  status: 'active' | 'invited' | 'left';
  createdAt: Date;
  updatedAt: Date;
}

const SplitMemberSchema = new Schema<ISplitMember>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'SplitGroup', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    guestName: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'invited', 'left'], default: 'active' },
  },
  { timestamps: true }
);

SplitMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true, sparse: true });
SplitMemberSchema.index({ groupId: 1, email: 1 });

export const SplitMember =
  mongoose.models.SplitMember || mongoose.model<ISplitMember>('SplitMember', SplitMemberSchema);
