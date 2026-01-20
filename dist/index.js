import { Flow } from "flow-launcher-helper";
import { query, connect, open, findFileZillaExecutable, } from "./api.js";
import MiniSearch from "minisearch";
const { requestParams, showResult, on, run, settings } = new Flow("app.png");
let miniSearch = new MiniSearch({
    idField: "title",
    fields: ["title", "subtitle"],
});
on("query", () => {
    const fileZillaBinPath = findFileZillaExecutable(settings === null || settings === void 0 ? void 0 : settings.binPath);
    if (!fileZillaBinPath) {
        return showResult({
            title: "Error",
            subtitle: "FileZilla executable path is not configured in the plugin settings.",
        });
    }
    let searchQuery = requestParams.join(" ");
    try {
        let sites = query().map((site) => ({
            title: site.name,
            subtitle: `Host: ${site.host} | User: ${site.user}`,
            method: "connect",
            params: [fileZillaBinPath, `${site.type}/${site.id}`],
            icoPath: "app.png",
        }));
        miniSearch.removeAll();
        miniSearch.addAll(sites);
        if (searchQuery.length) {
            const searchResults = miniSearch.search(searchQuery, {
                prefix: true,
                fuzzy: (term) => term.length >= 4 ? 0.25 : false,
                boost: { title: 5 },
                combineWith: 'AND'
            });
            sites = searchResults
                .map((result) => sites.find(site => site.title === result.id))
                .filter((site) => site !== undefined);
        }
        else {
            sites = [
                {
                    title: "FileZilla",
                    subtitle: "Launch FileZilla",
                    method: "open",
                    params: [fileZillaBinPath],
                    score: 100,
                },
                ...sites,
            ];
        }
        showResult(...sites);
    }
    catch (error) {
        return showResult({
            title: "Error",
            subtitle: error.message,
        });
    }
});
on("open", function (params) {
    open(params[0]);
});
on("connect", function (params) {
    connect(params[0], params[1]);
});
run();
