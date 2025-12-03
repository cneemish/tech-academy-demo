import mongoose, { Schema, Document } from 'mongoose';

export interface ITrainingPlan extends Document {
  planId: string;
  planName: string;
  description?: string;
  traineeId: string;
  traineeEmail: string;
  trainerId?: string;
  trainerEmail?: string;
  modules: {
    moduleName: string;
    trainerName?: string;
    startDate: Date;
    endDate: Date;
    status: 'pending' | 'in-progress' | 'completed';
  }[];
  status: 'draft' | 'scheduled' | 'in-progress' | 'completed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingPlanSchema: Schema = new Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    planName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    traineeId: {
      type: String,
      required: true,
    },
    traineeEmail: {
      type: String,
      required: true,
    },
    trainerId: {
      type: String,
    },
    trainerEmail: {
      type: String,
    },
    modules: [
      {
        moduleName: {
          type: String,
          required: true,
        },
        trainerName: {
          type: String,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed'],
          default: 'pending',
        },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in-progress', 'completed'],
      default: 'draft',
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.TrainingPlan || mongoose.model<ITrainingPlan>('TrainingPlan', TrainingPlanSchema);

