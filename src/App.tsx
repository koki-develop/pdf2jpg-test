import React, { useCallback, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const pdfjs = await import("pdfjs-dist/build/pdf");
const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry");
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

type Result = {
  name: string;
  data: Blob;
};

function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Result | null>(null);

  const handleChangeFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoading(true);

      const files = e.target.files;
      if (!files) return;
      if (files.length === 0) return;

      const file = files[0];
      const fileArrayBuffer = await file.arrayBuffer();
      const filename = file.name.replace(/\.[^/.]+$/, "");
      const pdf = await pdfjs.getDocument({
        data: fileArrayBuffer,
        cMapUrl: "/cmaps/",
        cMapPacked: true,
      }).promise;

      const images: string[] = [];
      const numPages = pdf.numPages;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        const viewport = page.getViewport({ scale: 1 });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = viewport.width * outputScale;
        canvas.height = viewport.height * outputScale;
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";

        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        await page.render({
          canvasContext: context,
          transform: transform ?? undefined,
          viewport,
        }).promise;

        const base64 = canvas.toDataURL("image/jpeg");
        images.push(base64);
      }

      const zip = new JSZip();

      images.forEach((image, i) => {
        zip.file(`${filename}_${i}.jpg`, image.split(",")[1], {
          base64: true,
        });
      });

      zip.generateAsync({ type: "blob" }).then((data) => {
        setResult({
          name: filename,
          data,
        });
      });
      setLoading(false);
    },
    []
  );

  const handleClickDownload = useCallback(() => {
    if (!result) return;
    saveAs(result.data, `${result.name}.zip`);
  }, [result]);

  return (
    <div>
      <div>
        <input
          type="file"
          onChange={handleChangeFile}
          accept="application/pdf"
        />
      </div>
      {loading && <div>読み込み中だよ</div>}
      {result && (
        <div>
          <button onClick={handleClickDownload}>download</button>
        </div>
      )}
    </div>
  );
}

export default App;
