"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => {
        const shell = document.querySelector<HTMLElement>(".min-h-screen");
        const sidebar = shell?.querySelector<HTMLElement>("aside");
        const header = shell?.querySelector<HTMLElement>("header");
        const appMain = shell?.querySelector<HTMLElement>("main");
        sidebar?.classList.add("print:hidden");
        header?.classList.add("print:hidden");
        appMain?.classList.add("print:max-w-none", "print:px-0", "print:py-0");
        window.addEventListener("afterprint", () => {
          sidebar?.classList.remove("print:hidden");
          header?.classList.remove("print:hidden");
          appMain?.classList.remove("print:max-w-none", "print:px-0", "print:py-0");
        }, { once: true });
        window.print();
      }}
      className="print:hidden"
    >
      <Printer className="size-4" aria-hidden /> Print / Save as PDF
    </Button>
  );
}
