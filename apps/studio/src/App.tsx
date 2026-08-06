import { IDELayout } from "@/app/ide-layout";
import { Toaster } from "@ise-studio/ui/sonner";
import { ErrorBoundary } from "@/app/components/error-boundary";
import { OnboardingModal } from "@/app/components/onboarding-modal";

function App() {
  return (
    <>
      <ErrorBoundary name="Application">
        <IDELayout />
      </ErrorBoundary>
      <OnboardingModal />
      <Toaster />
    </>
  );
}

export default App;
