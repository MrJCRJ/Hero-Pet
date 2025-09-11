import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { Dashboard } from "../components/dashboard/Dashboard";

// 🔹 Componente principal
function Home() {
  const { status, loading, lastUpdate, fetchStatus } = useStatus();
  const {
    showAdminPanel,
    accessCode,
    incorrectCode,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
  } = useAuth();

  if (loading)
    return <h1 className="text-center p-6 text-sm">Carregando...</h1>;

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen text-sm">
      <h1 className="text-lg font-bold text-center mb-4 text-gray-800">
        Sistema Hero-Pet
      </h1>

      {!showAdminPanel ? (
        <AccessForm
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          onSubmit={handleAccessCodeSubmit}
          incorrectCode={incorrectCode}
        />
      ) : (
        <>
          <AdminHeader onLogout={handleLogout} />
          <Dashboard
            status={status}
            lastUpdate={lastUpdate}
            onRefresh={fetchStatus}
          />
        </>
      )}
    </div>
  );
}

export default Home;
