import JSZip from "jszip";

export interface ExportableFile {
  path: string;
  contents?: string;
  content?: string;
}

/**
 * Builds a JSZip instance containing all project files.
 */
export async function buildProjectZip(
  files: Record<string, string> | Array<ExportableFile>
): Promise<JSZip> {
  const zip = new JSZip();

  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.path) {
        const body = f.contents ?? f.content ?? "";
        zip.file(f.path, body);
      }
    }
  } else {
    for (const [path, content] of Object.entries(files)) {
      if (path && typeof content === "string") {
        zip.file(path, content);
      }
    }
  }

  return zip;
}

/**
 * Downloads candidate project files as a standard .zip archive.
 * Supports FileMap Record<path, content>, FileWrite[] array, and ExportableFile[].
 */
export async function downloadProjectZip(
  files: Record<string, string> | Array<ExportableFile>,
  filename: string = "project.zip"
): Promise<Blob> {
  const zip = await buildProjectZip(files);

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = filename.toLowerCase().replace(/[^a-z0-9-_.]/g, "-");
    a.download = safeName.endsWith(".zip") ? safeName : `${safeName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return blob;
}
