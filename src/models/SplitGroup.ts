import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISplitGroup extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  currency: string;
  inviteCode: string;
  passcodeHash: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const SplitGroupSchema = new Schema<ISplitGroup>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    inviteCode: { type: String, required: true, index: true, uppercase: true },
    passcodeHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

SplitGroupSchema.index({ inviteCode: 1 }, { unique: true });

export const SplitGroup =
  mongoose.models.SplitGroup || mongoose.model<ISplitGroup>('SplitGroup', SplitGroupSchema);
