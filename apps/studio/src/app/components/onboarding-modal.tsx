import { useEffect, useState } from "react";
import { Bot, Code2, MousePointer2 } from "lucide-react";

import { Button } from "@ise-studio/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ise-studio/ui/dialog";

const ONBOARDING_KEY = "ise-studio-onboarding-complete";
const STEPS = [
  { icon: Code2, title: "Shape the solid", body: "Edit main.scad in the center canvas. OpenSCAD describes geometry with primitives, transformations, and boolean operations." },
  { icon: MousePointer2, title: "Compile as you go", body: "The preview runs in a worker, so the editor stays responsive. Use ⌘K to compile, import, export, or browse bundled libraries." },
  { icon: Bot, title: "Ask the assistant", body: "Add an OpenRouter key in Settings for syntax checks, scene inspection, documentation search, and controlled code edits." },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY) !== "true") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // The tutorial can still be dismissed when storage is unavailable.
    }
    setOpen(false);
  };
  const current = STEPS[step]!;
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && finish()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-md"><Icon className="size-5" /></div>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>{current.body}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => <span className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} key={item.title} />)}
        </div>
        <DialogFooter>
          <Button onClick={finish} variant="ghost">Skip</Button>
          {step < STEPS.length - 1 ? <Button onClick={() => setStep((value) => value + 1)}>Next</Button> : <Button onClick={finish}>Start modeling</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
