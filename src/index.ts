import { Flow, JSONRPCResponse } from "flow-launcher-helper";
import {
  query,
  connect,
  FileZillaSite,
  open,
  findFileZillaExecutable,
} from "./api.js";
import MiniSearch, { SearchResult } from "minisearch";

type Methods = "connect" | "open";
type Settings = {
  binPath: string;
};
type ConnectParams = [string, string];
type OpenParams = [string];

const { requestParams, showResult, on, run, settings } = new Flow<
  Methods,
  Settings
>("app.png");

let miniSearch = new MiniSearch({
  idField: "title",
  fields: ["title", "subtitle"], // fields to index for full-text search
});

// Index all documents

on("query", () => {
  const fileZillaBinPath = settings?.binPath || findFileZillaExecutable();

  if (!fileZillaBinPath) {
    return showResult({
      title: "Error",
      subtitle:
        "FileZilla executable path is not configured in the plugin settings.",
    });
  }

  let searchQuery = requestParams.join(" ");

  try {
    let sites: JSONRPCResponse<Methods>[] = query().map(
      (site: FileZillaSite) => ({
        title: site.name,
        subtitle: `Host: ${site.host} | User: ${site.user}`,
        method: "connect",
        params: [fileZillaBinPath, `${site.type}/${site.id}`] as ConnectParams,
        icoPath: "app.png",
      })
    );

    miniSearch.addAll(sites);

    if (searchQuery.length) {
      const results: { [key: string]: string } = miniSearch
        .search(searchQuery, {
            prefix: (term) => term.length >= 3,
            fuzzy: (term) => term.length >= 7 ? 0.5 : term.length >= 4 ? 0.2 : false
        })
        .reduce((acc: { [key: string]: string }, result: SearchResult) => {
          acc[result.id] = result.id;

          return acc;
        }, {});

      sites = sites.filter(
        (item: JSONRPCResponse<Methods>) => item.title in results
      );
    } else {
      sites = [
        {
          title: "FileZilla",
          subtitle: "Launch FileZilla",
          method: "open",
          params: [fileZillaBinPath] as OpenParams,
          score: 100,
        },
        ...sites,
      ];
    }

    showResult(...sites);
  } catch (error: any) {
    return showResult({
      title: "Error",
      subtitle: error.message,
    });
  }
});

on<OpenParams>("open", function (params: OpenParams) {
  open(params[0]);
});

on<ConnectParams>("connect", function (params: ConnectParams) {
  connect(params[0], params[1]);
});

run();
