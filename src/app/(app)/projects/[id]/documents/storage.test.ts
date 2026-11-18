import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  blobDel,
  blobGet,
  blobPut,
  fsMkdir,
  fsReadFile,
  fsRm,
  fsWriteFile,
} = vi.hoisted(() => ({
  blobDel: vi.fn(),
  blobGet: vi.fn(),
  blobPut: vi.fn(),
  fsMkdir: vi.fn(),
  fsReadFile: vi.fn(),
  fsRm: vi.fn(),
  fsWriteFile: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({ del: blobDel, get: blobGet, put: blobPut }));
vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({
  mkdir: fsMkdir,
  readFile: fsReadFile,
  rm: fsRm,
  writeFile: fsWriteFile,
}));

import {
  readFile,
  removeFile,
  saveFile,
  StorageFileNotFoundError,
} from "./storage";

describe("document storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses local disk in development when Blob credentials are absent", async () => {
    fsMkdir.mockResolvedValue(undefined);
    fsWriteFile.mockResolvedValue(undefined);
    const data = Buffer.from("local document");

    const storageKey = await saveFile("project", "notes.txt", data);

    expect(storageKey).toMatch(/^project\/[0-9a-f-]+-notes\.txt$/i);
    expect(fsMkdir).toHaveBeenCalledOnce();
    expect(fsWriteFile).toHaveBeenCalledWith(expect.stringContaining("uploads"), data);
    expect(blobPut).not.toHaveBeenCalled();
  });

  it("uses the connected Vercel Blob store credentials", async () => {
    vi.stubEnv("VERCEL_OIDC_TOKEN", "test-oidc-token");
    vi.stubEnv("BLOB_STORE_ID", "store_test");
    blobPut.mockResolvedValue({ pathname: "project/stored-notes.txt" });

    await saveFile("project", "notes.txt", Buffer.from("persistent document"));

    expect(blobPut).toHaveBeenCalledWith(
      expect.stringMatching(/^project\/[0-9a-f-]+-notes\.txt$/i),
      expect.any(Buffer),
      { access: "private" },
    );
    expect(fsWriteFile).not.toHaveBeenCalled();
  });

  it("fails in production rather than falling back to local disk", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(saveFile("project", "notes.txt", Buffer.from("data"))).rejects.toThrow(
      /Document storage is not configured/,
    );
    expect(fsWriteFile).not.toHaveBeenCalled();
  });

  it("writes, reads, and deletes private Vercel Blobs", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    blobPut.mockResolvedValue({ pathname: "project/stored-notes.txt" });
    blobGet.mockResolvedValue({
      statusCode: 200,
      stream: new Response("persistent document").body,
    });

    const storageKey = await saveFile("project", "notes.txt", Buffer.from("persistent document"));
    const downloaded = await readFile(storageKey);
    await removeFile(storageKey);

    expect(storageKey).toBe("project/stored-notes.txt");
    expect(blobPut).toHaveBeenCalledWith(
      expect.stringMatching(/^project\/[0-9a-f-]+-notes\.txt$/i),
      expect.any(Buffer),
      { access: "private" },
    );
    expect(blobGet).toHaveBeenCalledWith(storageKey, { access: "private" });
    expect(downloaded.toString()).toBe("persistent document");
    expect(blobDel).toHaveBeenCalledWith(storageKey);
    expect(fsWriteFile).not.toHaveBeenCalled();
  });

  it("reports missing stored blobs as not found", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    blobGet.mockResolvedValue(null);

    await expect(readFile("project/missing.txt")).rejects.toBeInstanceOf(StorageFileNotFoundError);
  });
});
