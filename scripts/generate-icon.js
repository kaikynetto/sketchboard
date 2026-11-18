// Renders build/icon.svg to build/icon.png (1024x1024, transparent margin).
// electron-builder converts build/icon.png to .icns and .ico when packaging.
// Run with: npm run icon
const fs = require("fs/promises");
const path = require("path");
const { app, BrowserWindow } = require("electron");

const size = 1024;
const buildDir = path.join(__dirname, "..", "build");

async function generateIcon() {
  const window = new BrowserWindow({
    frame: false,
    height: size,
    show: false,
    transparent: true,
    useContentSize: true,
    width: size
  });

  const svg = await fs.readFile(path.join(buildDir, "icon.svg"), "utf8");
  const html = `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`;

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => setTimeout(resolve, 400));

  let image = await window.webContents.capturePage();
  const imageSize = image.getSize();

  if (imageSize.width !== size) {
    image = image.resize({ height: size, quality: "best", width: size });
  }

  await fs.writeFile(path.join(buildDir, "icon.png"), image.toPNG());
  window.close();
}

app.whenReady().then(generateIcon).then(() => app.quit());
