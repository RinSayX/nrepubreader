import JSZip from "jszip";

import { parseEpubMetadataFromBase64 } from "@/services/epubMetadata";

async function makeEpubBase64({
  title = "测试书籍",
  author = "作者",
  includeCover = true
}: {
  title?: string;
  author?: string;
  includeCover?: boolean;
}) {
  const zip = new JSZip();
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`
  );

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?>
    <package version="3.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <metadata>
        <dc:title>${title}</dc:title>
        <dc:creator>${author}</dc:creator>
        <dc:identifier>urn:test:1</dc:identifier>
        ${includeCover ? '<meta name="cover" content="cover-image"/>' : ""}
      </metadata>
      <manifest>
        ${includeCover ? '<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg"/>' : ""}
        <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine>
        <itemref idref="chapter"/>
      </spine>
    </package>`
  );

  zip.file("OEBPS/chapter.xhtml", "<html><body><p>Hello</p></body></html>");
  if (includeCover) {
    zip.file("OEBPS/images/cover.jpg", "cover-data");
  }

  return zip.generateAsync({ type: "base64" });
}

describe("parseEpubMetadataFromBase64", () => {
  it("extracts metadata and cover image", async () => {
    const metadata = await parseEpubMetadataFromBase64(await makeEpubBase64({}));

    expect(metadata.title).toBe("测试书籍");
    expect(metadata.author).toBe("作者");
    expect(metadata.identifier).toBe("urn:test:1");
    expect(metadata.coverImage?.mimeType).toBe("image/jpeg");
  });

  it("returns null cover when the package has no cover", async () => {
    const metadata = await parseEpubMetadataFromBase64(await makeEpubBase64({ includeCover: false }));

    expect(metadata.title).toBe("测试书籍");
    expect(metadata.coverImage).toBeNull();
  });

  it("throws when container.xml is missing", async () => {
    const zip = new JSZip();
    zip.file("book.txt", "not an epub");

    await expect(parseEpubMetadataFromBase64(await zip.generateAsync({ type: "base64" }))).rejects.toThrow(
      "container.xml"
    );
  });
});
