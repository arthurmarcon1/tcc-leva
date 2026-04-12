import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Publish from "./pages/Publish";
import Shipments from "./pages/Shipments";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import EditProfile from "./pages/EditProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProfileVerification from "./pages/ProfileVerification";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
    <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
    <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
    <Route path="/profile/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    <Route path="/profile/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/profile/verification" element={<ProtectedRoute><ProfileVerification /></ProtectedRoute>} />
    <Route path="/profile/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
    <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
