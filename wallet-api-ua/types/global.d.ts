import React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "iconify-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          icon?: string;
          class?: string;
        },
        HTMLElement
      >;
    }
  }
}
export {};

declare global {
  interface Window {
    ethereum?: any;
  }
}
