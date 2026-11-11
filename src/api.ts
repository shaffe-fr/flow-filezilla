import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as xml2js from "xml2js";
import { spawn } from "node:child_process";

export type FileZillaSite = {
  id: string;
  name: string;
  user: string;
  host: string;
  type: 0 | 1;
};

export function findFileZillaExecutable(basePath?: string): string | null {
  const possiblePaths: string[] = [];

  // If a base path is provided, check it first
  if (basePath) {
    // If it's already pointing to the exe, return it
    if (basePath.toLowerCase().endsWith(".exe") && fs.existsSync(basePath)) {
      return basePath;
    }
    // Otherwise treat it as a directory
    possiblePaths.push(basePath);
  }

  const envProgramFiles = process.env.ProgramFiles;
  const envProgramFilesX86 = process.env["ProgramFiles(x86)"];

  // Add system environment variables to possible paths
  if (envProgramFiles) {
    possiblePaths.push(path.join(envProgramFiles, "FileZilla FTP Client"));
  }
  if (envProgramFilesX86) {
    possiblePaths.push(path.join(envProgramFilesX86, "FileZilla FTP Client"));
  }

  // Search for FileZilla executable in possible paths
  for (const dir of possiblePaths) {
    try {
      const files = fs.readdirSync(dir);
      const exeFile = files.find((file) =>
        file.toLowerCase() === "filezilla.exe"
      );
      if (exeFile) {
        const fullPath = path.join(dir, exeFile);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    } catch (err) {
      // Ignore errors for inaccessible directories
    }
  }

  return null; // FileZilla executable not found
}

export function open(executable: string) {
  spawn(executable, [], { detached: true, stdio: 'ignore' }).unref();
}

export function connect(executable: string, ftpName: string) {
  spawn(executable, ['--site', ftpName], { detached: true, stdio: 'ignore' }).unref();
}

export function findSiteManagerPath(executable?: string): string {
  // Portable installations store their configuration next to the executable
  if (executable) {
    const portablePath = path.join(
      path.dirname(executable),
      "Data",
      "settings",
      "sitemanager.xml"
    );
    if (fs.existsSync(portablePath)) {
      return portablePath;
    }
  }

  // Standard installation
  if (os.platform() != "win32") {
    throw new Error(
      `Unsupported platform "${os.platform()}": only Windows is supported`
    );
  }

  if (!process.env.APPDATA) {
    throw new Error(
      "Couldn't locate FileZilla config: %APPDATA% is not set and no portable Data/settings/sitemanager.xml was found next to the executable"
    );
  }

  return path.resolve(process.env.APPDATA, "FileZilla/sitemanager.xml");
}

export function query(executable?: string): FileZillaSite[] {
  // Path to Sitemanager XML file
  const siteManagerPath = findSiteManagerPath(executable);

  let sites: FileZillaSite[] = [];

  try {
    var data = fs.readFileSync(siteManagerPath);
    var parser = new xml2js.Parser();
    parser.parseString(data, function (err: any, result: any) {
      if (err) {
        throw new Error(err.toString());
      }

      if (!result.FileZilla3) {
        throw new Error("Only FileZilla 3 is supported");
      }

      if (!result.FileZilla3.Servers || !result.FileZilla3.Servers[0]) {
        throw new Error("No sites found");
      }

      sites = extractSites(result.FileZilla3.Servers[0]);
    });
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      throw new Error("Couldn't find FileZilla sitemanager config file");
    } else if (err) {
      throw new Error(err.toString());
    }
  }

  return sites;
}

function extractSites(node: any, parentFolder: string = "") {
  let sites: FileZillaSite[] = [];
  parentFolder = parentFolder || "";

  (node?.Server ?? []).forEach((site: any) => {
    sites.push({
      id: (parentFolder + site.Name?.[0]) as string,
      name: (parentFolder + site.Name?.[0]) as string,
      user: (site.User?.[0] ?? '') as string,
      host: `${site.Host?.[0] ?? ''}:${site.Port?.[0] ?? ''}` as string,
      type: (site.Type?.[0] ?? 0) as 0 | 1,
    });
  });

  (node?.Folder ?? []).forEach((folder: any) => {
    sites = [
      ...sites,
      ...extractSites(folder, parentFolder + folder._.trim() + "/"),
    ];
  });

  return sites;
}
