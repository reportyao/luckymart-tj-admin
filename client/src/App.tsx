import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import Home from "./pages/Home";
import Platform from "./pages/Platform";
import Guide from "./pages/Guide";
import Scripts from "./pages/Scripts";
import Materials from "./pages/Materials";
import FAQ from "./pages/FAQ";
import "./i18n";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/platform"} component={Platform} />
      <Route path={"/guide"} component={Guide} />
      <Route path={"/scripts"} component={Scripts} />
      <Route path={"/materials"} component={Materials} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster position="top-center" />
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Header />
              <main className="flex-1">
                <Router />
              </main>
              <BottomNav />
            </div>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
