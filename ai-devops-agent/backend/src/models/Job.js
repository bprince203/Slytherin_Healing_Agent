import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    repoUrl: String,
    status: { type: String, default: 'queued' },
    score: Number,
    timeline: [Object],
    result: Object,
  },
  { timestamps: true }
);

const Job = mongoose.model('Job', JobSchema);

export default Job;
