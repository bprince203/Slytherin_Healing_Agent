import { create } from 'zustand';

const useJobStore = create((set) => ({
  jobs: [],
  selectedJob: null,
  setJobs: (jobs) => set({ jobs }),
  selectJob: (job) => set({ selectedJob: job }),
}));

export default useJobStore;
