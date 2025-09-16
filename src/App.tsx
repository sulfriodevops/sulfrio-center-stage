import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Index from "./pages/Index";
import HVACCalculator from "./pages/HVACCalculator";
import VRFCalculator from "./pages/VRFCalculator";
import DiariasCalculator from "./pages/DiariasCalculator";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user || !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <>
      {user && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/multi" 
          element={
            <ProtectedRoute>
              <HVACCalculator />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vrf" 
          element={
            <ProtectedRoute>
              <VRFCalculator />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/diarias" 
          element={
            <ProtectedRoute>
              <DiariasCalculator />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/configuracoes/usuarios" 
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
