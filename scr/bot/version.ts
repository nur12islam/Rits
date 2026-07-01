export const __major__ = 1;
export const __minor__ = 0;
export const __micro__ = 2;

export const __python_version__ = process.version; // Equivalent for Node
export const __license__ = "[GNU GPL v3.0](https://github.com/RITSTeam/RITS/blob/master/LICENSE)";
export const __copyright__ = "[RITSTeam](https://github.com/RITSTeam)";

export function getVersion(): string {
    return `${__major__}.${__minor__}.${__micro__}`;
}

export async function getFullVersion(): Promise<string> {
    const core = { count: 100, branch: "master" }; // Mocked core versioning
    const ver = `${getVersion()}-build.${core.count}`;
    return ver + '@' + core.branch;
}
