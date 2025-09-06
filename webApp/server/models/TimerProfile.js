import mongoose from 'mongoose';

const timerProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isCountdown: {
    type: Boolean,
    default: true
  },
  workDuration: {
    type: Number,
    required: true
  },
  isBreakEnabled: {
    type: Boolean,
    default: true
  },
  breakDuration: {
    type: Number,
    required: true
  },
  isLongBreakEnabled: {
    type: Boolean,
    default: false
  },
  longBreakDuration: {
    type: Number,
    required: true
  },
  sessionsBeforeLongBreak: {
    type: Number,
    required: true,
    default: 4
  },
  workBreakRatio: {
    type: Number,
    required: true,
    default: 3
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

export default mongoose.model('TimerProfile', timerProfileSchema);