import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import Index from "./pages/Index";
import ProgramDetail from "./pages/ProgramDetail";
import TrainingSession from "./pages/TrainingSession";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Coach from "./pages/Coach";
import AIBuilder from "./pages/AIBuilder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <WorkoutProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/program/:programId" element={<ProgramDetail />} />
            <Route path="/training/:programId/:sessionId" element={<TrainingSession />} />
            <Route path="/history" element={<History />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/ai-builder" element={<AIBuilder />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkoutProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
