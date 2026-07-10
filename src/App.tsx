import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { SaveStatusBanner } from "@/components/SaveStatusBanner";
import Index from "./pages/Index";
import ProgramDetail from "./pages/ProgramDetail";
import TrainingSession from "./pages/TrainingSession";
import History from "./pages/History";
import SessionDetail from "./pages/SessionDetail";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <WorkoutProvider>
          <SaveStatusBanner />
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/program/:programId" element={<ProgramDetail />} />
            <Route path="/training/:programId/:sessionId" element={<TrainingSession />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/session/:id" element={<SessionDetail />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkoutProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
