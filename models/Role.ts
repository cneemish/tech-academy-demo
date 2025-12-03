import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  roleId: string;
  roleName: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    roleId: {
      type: String,
      required: true,
      unique: true,
    },
    roleName: {
      type: String,
      required: true,
      unique: true,
      enum: ['superadmin', 'admin', 'trainee'],
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

