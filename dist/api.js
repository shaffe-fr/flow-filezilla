import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as xml2js from "xml2js";
import { spawn } from "node:child_process";
export function findFileZillaExecutable(basePath) {
    const possiblePaths = [];
    if (basePath) {
        if (basePath.toLowerCase().endsWith(".exe") && fs.existsSync(basePath)) {
            return basePath;
        }
        possiblePaths.push(basePath);
    }
    const envProgramFiles = process.env.ProgramFiles;
    const envProgramFilesX86 = process.env["ProgramFiles(x86)"];
    if (envProgramFiles) {
        possiblePaths.push(path.join(envProgramFiles, "FileZilla FTP Client"));
    }
    if (envProgramFilesX86) {
        possiblePaths.push(path.join(envProgramFilesX86, "FileZilla FTP Client"));
    }
    for (const dir of possiblePaths) {
        try {
            const files = fs.readdirSync(dir);
            const exeFile = files.find((file) => file.toLowerCase() === "filezilla.exe");
            if (exeFile) {
                const fullPath = path.join(dir, exeFile);
                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
        }
        catch (err) {
        }
    }
    return null;
}
export function open(executable) {
    spawn(executable, [], { detached: true, stdio: 'ignore' }).unref();
}
export function connect(executable, ftpName) {
    spawn(executable, ['--site', ftpName], { detached: true, stdio: 'ignore' }).unref();
}
export function query() {
    let siteManagerPath;
    if (os.platform() == "win32") {
        siteManagerPath = path.resolve(process.env.APPDATA, "FileZilla/sitemanager.xml");
    }
    else {
        throw new Error("Unsupported Platform");
    }
    let sites = [];
    try {
        var data = fs.readFileSync(siteManagerPath);
        var parser = new xml2js.Parser();
        parser.parseString(data, function (err, result) {
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
    }
    catch (err) {
        if (err && err.code === "ENOENT") {
            throw new Error("Couldn't find FileZilla sitemanager config file");
        }
        else if (err) {
            throw new Error(err.toString());
        }
    }
    return sites;
}
function extractSites(node, parentFolder = "") {
    var _a, _b;
    let sites = [];
    parentFolder = parentFolder || "";
    ((_a = node === null || node === void 0 ? void 0 : node.Server) !== null && _a !== void 0 ? _a : []).forEach((site) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        sites.push({
            id: (parentFolder + ((_a = site.Name) === null || _a === void 0 ? void 0 : _a[0])),
            name: (parentFolder + ((_b = site.Name) === null || _b === void 0 ? void 0 : _b[0])),
            user: ((_d = (_c = site.User) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : ''),
            host: `${(_f = (_e = site.Host) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : ''}:${(_h = (_g = site.Port) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : ''}`,
            type: ((_k = (_j = site.Type) === null || _j === void 0 ? void 0 : _j[0]) !== null && _k !== void 0 ? _k : 0),
        });
    });
    ((_b = node === null || node === void 0 ? void 0 : node.Folder) !== null && _b !== void 0 ? _b : []).forEach((folder) => {
        sites = [
            ...sites,
            ...extractSites(folder, parentFolder + folder._.trim() + "/"),
        ];
    });
    return sites;
}
