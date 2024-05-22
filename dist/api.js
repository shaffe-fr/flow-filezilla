import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as xml2js from "xml2js";
import { execSync } from "node:child_process";
export function findFileZillaExecutable() {
    const envProgramFiles = process.env.ProgramFiles;
    const envProgramFilesX86 = process.env["ProgramFiles(x86)"];
    const possiblePaths = [];
    if (envProgramFiles) {
        possiblePaths.push(path.join(envProgramFiles, "FileZilla FTP Client"));
    }
    if (envProgramFilesX86) {
        possiblePaths.push(path.join(envProgramFilesX86, "FileZilla FTP Client"));
    }
    for (const dir of possiblePaths) {
        try {
            const files = fs.readdirSync(dir);
            const exeFile = files.find((file) => file.toLowerCase().startsWith("filezilla.exe"));
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
    execSync(`"${executable}"`);
}
export function connect(executable, ftpName) {
    execSync(`"${executable}" --site "${ftpName}"`);
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
        sites.push({
            id: (parentFolder + site.Name[0]),
            name: (parentFolder + site.Name[0]),
            user: site.User[0],
            host: `${site.Host[0]}:${site.Port[0]}`,
            type: site.Type[0],
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
