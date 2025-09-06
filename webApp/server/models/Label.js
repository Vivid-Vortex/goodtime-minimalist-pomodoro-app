import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: Number,
    required: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  orderIndex: {
    type: Number,
    required: true,
    default: 0
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
labelSchema.index({ orderIndex: 1 });
labelSchema.index({ archived: 1 });

export default mongoose.model('Label', labelSchema);