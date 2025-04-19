import { Button } from "./ui/button";
import { Coffee, CreditCard, Banknote } from "lucide-react";

export function ContactSection() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Button asChild variant="outline" className="w-full max-w-sm">
        <a
          href="https://buymeacoffee.com/raulpetruta"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-2"
          onClick={(e) => {
            e.preventDefault();
            window
              .open("https://buymeacoffee.com/raulpetruta", "_blank")
              ?.focus();
          }}
        >
          <Coffee className="w-4 h-4" />
          <span>Buy Me a Coffee</span>
        </a>
      </Button>

      <Button asChild variant="outline" className="w-full max-w-sm">
        <a
          href="https://revolut.me/petrutaraul"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-2"
          onClick={(e) => {
            e.preventDefault();
            window.open("https://revolut.me/petrutaraul", "_blank")?.focus();
          }}
        >
          <CreditCard className="w-4 h-4" />
          <span>Support via Revolut</span>
        </a>
      </Button>

      <Button asChild variant="outline" className="w-full max-w-sm">
        <a
          href="https://paypal.me/raulpetruta98"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-2"
          onClick={(e) => {
            e.preventDefault();
            window.open("https://paypal.me/raulpetruta98", "_blank")?.focus();
          }}
        >
          <Banknote className="w-4 h-4" />
          <span>Donate with PayPal</span>
        </a>
      </Button>
    </div>
  );
}
