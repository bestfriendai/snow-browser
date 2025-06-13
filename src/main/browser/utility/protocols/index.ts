import { registerSnowProtocol } from "@/browser/utility/protocols/_protocols/flow";
import { registerSnowExternalProtocol } from "@/browser/utility/protocols/_protocols/flow-external";
import { PATHS } from "@/modules/paths";
import { protocol, Session } from "electron";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "snow-internal",
    privileges: { standard: true, secure: true, bypassCSP: true, codeCache: true, supportFetchAPI: true }
  },
  {
    scheme: "snow",
    privileges: { standard: true, secure: true, bypassCSP: true, codeCache: true, supportFetchAPI: true }
  },
  {
    scheme: "snow-external",
    privileges: { standard: true, secure: true }
  }
]);

export function registerProtocolsWithSession(session: Session) {
  const protocol = session.protocol;
  registerSnowProtocol(protocol);
  registerSnowExternalProtocol(protocol);
}

export function registerPreloadScript(session: Session) {
  session.registerPreloadScript({
    id: "snow-preload",
    filePath: PATHS.PRELOAD
  });
}
