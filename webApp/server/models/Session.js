import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  interruptions: {
    type: Number,
    default: 0
  },
  is_break: {
    type: Boolean,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  deviceId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
sessionSchema.index({ end: -1 });
sessionSchema.index({ label: 1 });
sessionSchema.index({ archived: 1 });
sessionSchema.index({ is_break: 1 });

export default mongoose.model('Session', sessionSchema);