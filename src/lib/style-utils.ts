import exportStylesContent from "./ExportResults.scss?raw";

// This function returns the content of the SCSS file as a string
// to be used in the HTML export template
export function getExportStyles(): string {
  return exportStylesContent;
}
