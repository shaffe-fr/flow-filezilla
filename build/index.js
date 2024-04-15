import { Flow } from "flow-launcher-helper";
import { query, connect, open } from "./api.js";
import MiniSearch from "minisearch";
const { requestParams, showResult, on, run, settings } = new Flow("app.png");
let miniSearch = new MiniSearch({
  idField: "title",
  fields: ["title", "subtitle"],
  searchOptions: {
    boost: { title: 3 },
    prefix: true,
    fuzzy: 0.2,
  },
});
on("query", () => {
  if (!(settings === null || settings === void 0 ? void 0 : settings.binPath)) {
    return showResult({
      title: "Error",
      subtitle: "FileZilla executable path was not set in plugin settings.",
    });
  }
  let searchQuery = requestParams.join(" ");
  try {
    let sites = query().map((site) => ({
      title: site.name,
      subtitle: `Host: ${site.host} | User: ${site.user}`,
      method: "connect",
      params: [`${settings.binPath}`, `${site.type}/${site.id}`],
      icoPath: "app.png",
    }));
    miniSearch.addAll(sites);
    if (searchQuery.length) {
      const results = miniSearch.search(searchQuery).reduce((acc, result) => {
        acc[result.id] = result.id;
        return acc;
      }, {});
      sites = sites.filter((item) => item.title in results);
    } else {
      sites = [
        {
          title: "FileZilla",
          subtitle: "Open FileZilla",
          method: "open",
          params: [`${settings.binPath}`],
          score: 100,
        },
        ...sites,
      ];
    }
    showResult(...sites);
  } catch (error) {
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
