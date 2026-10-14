import RequireAuth from '../../../../src/components/RequireAuth';
import EditMinerPage from '../../../../src/components/EditMinerPage';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <RequireAuth>
      <EditMinerPage />
    </RequireAuth>
  );
}
