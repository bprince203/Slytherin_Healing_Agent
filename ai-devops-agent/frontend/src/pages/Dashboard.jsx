import ResultTable from '../components/ResultTable';
import Timeline from '../components/Timeline';
import ScoreCard from '../components/ScoreCard';

function Dashboard() {
  return (
    <main>
      <h1>Dashboard</h1>
      <ScoreCard />
      <Timeline />
      <ResultTable />
    </main>
  );
}

export default Dashboard;
