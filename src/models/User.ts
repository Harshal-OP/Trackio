import mongoose, { Schema, Document } from 'mongoose';

interface IUserNotificationSettings {
    subscriptionDue: boolean;
    budgetAlerts: boolean;
    weeklySummary: boolean;
    emailNotifications: boolean;
}

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    plan: 'free' | 'pro';
    settings: {
        currency: string;
        notifications: IUserNotificationSettings;
    };
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSettingsSchema = new Schema<IUserNotificationSettings>(
    {
        subscriptionDue: { type: Boolean, default: true },
        budgetAlerts: { type: Boolean, default: true },
        weeklySummary: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: false },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        plan: { type: String, enum: ['free', 'pro'], default: 'free' },
        settings: {
            currency: { type: String, default: 'USD', uppercase: true, trim: true, minlength: 3, maxlength: 3 },
            notifications: { type: NotificationSettingsSchema, default: () => ({}) },
        },
    },
    { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
