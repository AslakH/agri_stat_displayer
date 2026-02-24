import path from "node:path";
import { readJson, rootDir } from "./io";
import { normalizeName } from "./normalize";

interface AliasFile {
  aliases: Record<string, string>;
}

export const loadAliasMap = async (): Promise<Map<string, string>> => {
  const aliasPath = path.join(rootDir, "datasets", "_aliases.json");
  let payload: AliasFile = { aliases: {} };
  try {
    payload = await readJson<AliasFile>(aliasPath);
  } catch {
    return new Map();
  }
  const map = new Map<string, string>();

  for (const [alias, canonical] of Object.entries(payload.aliases ?? {})) {
    map.set(normalizeName(alias), normalizeName(canonical));
  }

  return map;
};
