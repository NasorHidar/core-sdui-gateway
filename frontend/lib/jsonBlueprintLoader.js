import fs from "fs";
import path from "path";

/**
 * Helper to get the canonical blueprints directory regardless of whether
 * process.cwd() is the repository root or the frontend directory.
 */
export function getBlueprintsDir() {
  const candidates = [
    path.join(process.cwd(), "blueprints"),
    path.join(process.cwd(), "frontend", "blueprints"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  // Default fallback
  return path.join(process.cwd(), "blueprints");
}

/**
 * List all available blueprint JSON files on disk.
 * Returns metadata about each blueprint for dynamic navigation and diagnostics.
 */
export async function listAvailableBlueprints() {
  const dir = getBlueprintsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const jsonFiles = entries.filter(
      (e) => e.isFile() && e.name.toLowerCase().endsWith(".json")
    );

    const blueprintsList = [];
    for (const file of jsonFiles) {
      const pageId = file.name.replace(/\.json$/i, "");
      const fullPath = path.join(dir, file.name);
      try {
        const content = await fs.promises.readFile(fullPath, "utf-8");
        const parsed = JSON.parse(content);
        const stats = await fs.promises.stat(fullPath);

        const widgetCount =
          (Array.isArray(parsed.widgets) && parsed.widgets.length) ||
          (Array.isArray(parsed.components) && parsed.components.length) ||
          0;

        blueprintsList.push({
          pageId,
          fileName: file.name,
          title: parsed.pageTitle || `Page ${pageId}`,
          widgetCount,
          sizeBytes: stats.size,
          mtime: stats.mtime.toISOString(),
          isDynamic: Array.isArray(parsed.widgets) && parsed.widgets.length > 0,
          allowedRoles: parsed.allowedRoles || "",
        });
      } catch (err) {
        blueprintsList.push({
          pageId,
          fileName: file.name,
          title: `Page ${pageId}`,
          widgetCount: 0,
          error: err.message,
        });
      }
    }

    return blueprintsList.sort((a, b) => a.pageId.localeCompare(b.pageId, undefined, { numeric: true }));
  } catch (err) {
    console.error("[jsonBlueprintLoader] Failed to list blueprints:", err);
    return [];
  }
}

/**
 * Loads a single blueprint from a physical JSON file on disk.
 *
 * @param {string|number} pageId - e.g. "102", "102.json", or "fund-transfer"
 * @returns {Promise<{ blueprint: object, meta: object }>}
 */
export async function loadBlueprintFromJson(pageId) {
  if (!pageId) {
    throw new Error("Missing pageId parameter to load blueprint");
  }

  const cleanId = String(pageId).replace(/\.json$/i, "").trim();
  const dir = getBlueprintsDir();
  const targetFile = `${cleanId}.json`;
  const fullPath = path.join(dir, targetFile);

  if (!fs.existsSync(fullPath)) {
    const available = await listAvailableBlueprints();
    const err = new Error(
      `Blueprint JSON file '${targetFile}' not found in '${dir}'`
    );
    err.status = 404;
    err.availableBlueprints = available;
    throw err;
  }

  try {
    const content = await fs.promises.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(content);
    const stats = await fs.promises.stat(fullPath);

    // Normalize layoutType and defaults
    const blueprint = {
      ...parsed,
      pageTitle: parsed.pageTitle || `Page ${cleanId}`,
      layoutType: parsed.layoutType || "VERTICAL_STACK",
      widgets: Array.isArray(parsed.widgets) ? parsed.widgets : undefined,
      components: Array.isArray(parsed.components) ? parsed.components : undefined,
    };

    return {
      blueprint,
      meta: {
        pageId: cleanId,
        fileName: targetFile,
        filePath: fullPath,
        sizeBytes: stats.size,
        lastModified: stats.mtime.toISOString(),
      },
    };
  } catch (parseErr) {
    const err = new Error(
      `Failed to parse JSON blueprint from '${targetFile}': ${parseErr.message}`
    );
    err.status = 500;
    throw err;
  }
}
