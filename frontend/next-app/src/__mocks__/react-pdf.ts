import React from "react";

export const Document = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "pdf-document" }, children);

export const Page = () =>
  React.createElement("div", { "data-testid": "pdf-page" });

export const pdfjs = {
  GlobalWorkerOptions: { workerSrc: "" },
};
