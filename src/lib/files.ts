/**
 * File-tree primitives shared by server and client.
 *
 * A project is a flat `path -> contents` map. That is the unit the build
 * assistant writes (whole files), the unit we persist per turn, and the unit we
 * snapshot at submission. Nothing here touches the DOM or Node APIs.
 */

export type FileMap = Record<string, string>;

export interface FileWrite {
  path: string;
  contents: string;
}

export const LIMITS = {
  maxFiles: 150,
  maxFileBytes: 300_000,
  maxTotalBytes: 2_000_000,
  maxPathLength: 200,
} as const;

const FORBIDDEN_SEGMENTS = new Set(["node_modules", ".git", ".next"]);

export class PathError extends Error {}

/**
 * Normalise to a project-relative POSIX path. Throws `PathError` for anything
 * that could escape the project or shadow tooling directories. Mirrors the
 * `norm()` helper in ButterCup's VFS, but rejects `..` past the root instead of
 * silently clamping it.
 */
export function normalizePath(input: string): string {
  if (typeof input !== "string" || !input.trim()) throw new PathError("path is empty");
  if (input.includes("\0")) throw new PathError("path contains a null byte");
  if (/^[a-zA-Z]:/.test(input)) throw new PathError(`absolute paths are not allowed: ${input}`);

  const out: string[] = [];
  for (const seg of input.replace(/\\/g, "/").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (!out.length) throw new PathError(`path escapes the project: ${input}`);
      out.pop();
    } else {
      out.push(seg);
    }
  }
  if (!out.length) throw new PathError(`not a file path: ${input}`);
  if (out.some((s) => FORBIDDEN_SEGMENTS.has(s))) {
    throw new PathError(`path is inside a protected directory: ${input}`);
  }
  const path = out.join("/");
  if (path.length > LIMITS.maxPathLength) throw new PathError(`path is too long: ${input}`);
  return path;
}

export interface SanitizedWrites {
  valid: FileWrite[];
  rejected: { path: string; reason: string }[];
}

/**
 * Validate a batch of writes coming from the model. Bad entries are reported,
 * never thrown: one malformed path must not cost the candidate the whole turn.
 * Later writes to the same path win (models occasionally repeat a file).
 */
export function sanitizeWrites(writes: readonly FileWrite[], existing: FileMap = {}): SanitizedWrites {
  const byPath = new Map<string, FileWrite>();
  const rejected: SanitizedWrites["rejected"] = [];

  for (const w of writes) {
    try {
      const path = normalizePath(w.path);
      if (typeof w.contents !== "string") throw new PathError("contents must be a string");
      if (byteLength(w.contents) > LIMITS.maxFileBytes) {
        throw new PathError(`file exceeds ${LIMITS.maxFileBytes} bytes`);
      }
      byPath.set(path, { path, contents: w.contents });
    } catch (err) {
      rejected.push({ path: String(w?.path ?? ""), reason: err instanceof Error ? err.message : "invalid" });
    }
  }

  // Enforce project-wide caps on the merged result.
  const valid: FileWrite[] = [];
  const merged: FileMap = { ...existing };
  for (const w of byPath.values()) {
    const next = { ...merged, [w.path]: w.contents };
    if (Object.keys(next).length > LIMITS.maxFiles) {
      rejected.push({ path: w.path, reason: `project would exceed ${LIMITS.maxFiles} files` });
      continue;
    }
    if (totalBytes(next) > LIMITS.maxTotalBytes) {
      rejected.push({ path: w.path, reason: `project would exceed ${LIMITS.maxTotalBytes} bytes` });
      continue;
    }
    merged[w.path] = w.contents;
    valid.push(w);
  }
  return { valid, rejected };
}

/** Immutable apply: returns a new map with `writes` layered on top of `base`. */
export function applyWrites(base: FileMap, writes: readonly FileWrite[]): FileMap {
  const next: FileMap = { ...base };
  for (const w of writes) next[w.path] = w.contents;
  return next;
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function totalBytes(files: FileMap): number {
  let n = 0;
  for (const v of Object.values(files)) n += byteLength(v);
  return n;
}

export function toFileList(files: FileMap): FileWrite[] {
  return Object.keys(files)
    .sort()
    .map((path) => ({ path, contents: files[path] }));
}

export function fromFileList(list: readonly FileWrite[]): FileMap {
  const out: FileMap = {};
  for (const f of list) out[f.path] = f.contents;
  return out;
}

/** Structural twin of WebContainer's FileSystemTree, kept local so this module stays isomorphic. */
export type FsTree = {
  [name: string]: { file: { contents: string } } | { directory: FsTree };
};

/** Nest a flat map into the directory/file tree that `webcontainer.mount()` expects. */
export function toFileSystemTree(files: FileMap): FsTree {
  const root: FsTree = {};
  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const existing = node[parts[i]];
      if (existing && "directory" in existing) {
        node = existing.directory;
      } else {
        const dir: FsTree = {};
        node[parts[i]] = { directory: dir };
        node = dir;
      }
    }
    node[parts[parts.length - 1]] = { file: { contents: files[path] } };
  }
  return root;
}

export interface TreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeEntry[];
}

/** Sorted (dirs first) nested listing for the read-only file tree UI. */
export function buildTreeEntries(paths: readonly string[]): TreeEntry[] {
  const root: TreeEntry = { name: "", path: "", type: "dir", children: [] };
  for (const path of [...paths].sort()) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((name, i) => {
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let child = node.children!.find((c) => c.name === name && c.type === (isFile ? "file" : "dir"));
      if (!child) {
        child = { name, path: childPath, type: isFile ? "file" : "dir", ...(isFile ? {} : { children: [] }) };
        node.children!.push(child);
      }
      node = child;
    });
  }
  const sort = (e: TreeEntry) => {
    e.children?.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    e.children?.forEach(sort);
  };
  sort(root);
  return root.children ?? [];
}
