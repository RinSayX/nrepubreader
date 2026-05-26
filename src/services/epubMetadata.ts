import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

export type ParsedEpubMetadata = {
  title: string;
  author: string | null;
  identifier: string | null;
  coverImage: {
    fileName: string;
    mimeType: string;
    base64: string;
  } | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text"
});

export async function parseEpubMetadataFromBase64(base64: string, fallbackTitle = "未命名书籍"): Promise<ParsedEpubMetadata> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) {
    throw new Error("EPUB container.xml is missing.");
  }

  const container = parser.parse(containerXml);
  const rootfile = firstOf(container?.container?.rootfiles?.rootfile);
  const opfPath = rootfile?.["@_full-path"];
  if (!opfPath) {
    throw new Error("EPUB rootfile path is missing.");
  }

  const opfXml = await zip.file(opfPath)?.async("string");
  if (!opfXml) {
    throw new Error("EPUB package document is missing.");
  }

  const opf = parser.parse(opfXml);
  const pkg = opf.package;
  const metadata = pkg?.metadata ?? {};
  const manifestItems = normalizeArray(pkg?.manifest?.item);

  const title = stringValue(firstOf(metadata["dc:title"])) || fallbackTitle;
  const author = stringValue(firstOf(metadata["dc:creator"])) || null;
  const identifier = stringValue(firstOf(metadata["dc:identifier"])) || null;

  const coverId = findCoverId(metadata);
  const coverItem = manifestItems.find((item) => item["@_id"] === coverId) ?? manifestItems.find((item) => {
    const properties = String(item["@_properties"] ?? "");
    const mediaType = String(item["@_media-type"] ?? "");
    return properties.includes("cover-image") || mediaType.startsWith("image/");
  });

  const coverImage = coverItem ? await readCover(zip, opfPath, coverItem) : null;

  return {
    title,
    author,
    identifier,
    coverImage
  };
}

function firstOf<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function stringValue(value: unknown): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "object" && value && "#text" in value) {
    return String((value as { "#text": string })["#text"]).trim();
  }
  return String(value).trim();
}

function findCoverId(metadata: Record<string, unknown>) {
  const metas = normalizeArray<Record<string, string>>(metadata.meta as Record<string, string> | Record<string, string>[]);
  return metas.find((meta) => meta["@_name"] === "cover")?.["@_content"] ?? null;
}

async function readCover(zip: JSZip, opfPath: string, manifestItem: Record<string, string>) {
  const href = manifestItem["@_href"];
  const mimeType = manifestItem["@_media-type"] ?? "image/jpeg";
  if (!href) {
    return null;
  }

  const opfDirectory = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const normalizedHref = `${opfDirectory}${href}`.replace(/^\.\//, "");
  const file = zip.file(normalizedHref);
  if (!file) {
    return null;
  }

  return {
    fileName: href.split("/").pop() ?? "cover",
    mimeType,
    base64: await file.async("base64")
  };
}
