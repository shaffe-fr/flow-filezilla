import { spawnSync } from "node:child_process";

export function alert(message: string) {
  spawnSync("powershell.exe", [
    `
    Add-Type -AssemblyName PresentationCore,PresentationFramework;
    [System.Windows.MessageBox]::Show('${message}');
    `,
  ]);
}
