import { Types } from 'mongoose';
import { ApiHttpError } from '@/lib/api-response';
import { SplitGroup } from '@/models/SplitGroup';
import { SplitMember } from '@/models/SplitMember';

export async function findUserMember(groupId: string, userId: string) {
  return SplitMember.findOne({
    groupId: new Types.ObjectId(groupId),
    userId: new Types.ObjectId(userId),
    status: { $in: ['active', 'invited'] },
  });
}

export async function requireGroupMember(groupId: string, userId: string) {
  const member = await findUserMember(groupId, userId);
  if (!member) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'You are not a member of this group');
  }

  const group = await SplitGroup.findById(groupId);
  if (!group) {
    throw new ApiHttpError(404, 'NOT_FOUND', 'Group not found');
  }

  return { group, member };
}

export async function requireGroupOwner(groupId: string, userId: string) {
  const { group, member } = await requireGroupMember(groupId, userId);
  if (member.role !== 'owner' || group.ownerId.toString() !== userId) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'Only group owner can perform this action');
  }
  return { group, member };
}

export function serializeSplitGroup(group: {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  currency: string;
  status: string;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: group._id.toString(),
    ownerId: group.ownerId.toString(),
    name: group.name,
    description: group.description,
    currency: group.currency,
    status: group.status,
    inviteCode: group.inviteCode,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function serializeSplitMember(member: {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  guestName?: string;
  email?: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: member._id.toString(),
    groupId: member.groupId.toString(),
    userId: member.userId ? member.userId.toString() : undefined,
    guestName: member.guestName,
    email: member.email,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}
