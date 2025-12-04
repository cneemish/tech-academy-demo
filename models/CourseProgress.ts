import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  userId: string;
  courseId: string;
  courseUid: string;
  completedModules: string[]; // Array of module UIDs that are completed
  currentModule?: string; // Current module UID the user is on
  progress: number; // Percentage (0-100)
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseProgressSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    courseUid: {
      type: String,
      required: true,
    },
    completedModules: {
      type: [String],
      default: [],
    },
    currentModule: {
      type: String,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one progress record per user per course
CourseProgressSchema.index({ userId: 1, courseUid: 1 }, { unique: true });

export default mongoose.models.CourseProgress || mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);

