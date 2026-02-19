import FixTable from '../components/FixTable';
import Timeline from '../components/Timeline';
import StatusCard from '../components/StatusCard';

function Dashboard() {
  return (
    <main>
      <h1>Dashboard</h1>
      <StatusCard />
      <Timeline />
      <FixTable />
    </main>
  );
}

export default Dashboard;
