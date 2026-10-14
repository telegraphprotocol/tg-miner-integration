import RequireAuth from '../../src/components/RequireAuth';
import WasmPage from '../../src/components/WasmPage';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <RequireAuth>
      <WasmPage />
    </RequireAuth>
  );
}
