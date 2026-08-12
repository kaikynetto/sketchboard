const fs = require("fs/promises");
const path = require("path");
const { app, BrowserWindow } = require("electron");

async function captureScreenshot() {
  const window = new BrowserWindow({
    backgroundColor: "#000000",
    frame: false,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "src", "preload.js")
    },
    width: 1440
  });

  await window.loadFile(path.join(__dirname, "..", "src", "renderer", "index.html"));
  await window.webContents.executeJavaScript(`
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        document.querySelector("#workflow-title").textContent = "Landing workflow";
        document.querySelector("#workflow-count").textContent = "3 workflows";
        document.querySelector("#save-status-text").textContent = "Workspace salvo";
        document.querySelector("#empty-state").classList.add("is-hidden");
        const canvas = document.querySelector("#sketch-canvas");
        const context = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        context.save();
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.translate(width / 2 - 180, height / 2 - 80);
        context.strokeStyle = "#ffffff";
        context.lineWidth = 8;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(0, 120);
        context.bezierCurveTo(80, -50, 220, 220, 350, 70);
        context.stroke();

        context.fillStyle = "#ffffff";
        context.font = "700 52px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        context.fillText("Sketchboard", -20, -4);
        context.font = "500 26px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        context.fillText("Workflows, texto, imagens e rabiscos.", -18, 34);
        context.restore();
        resolve();
      });
    });
  `);
  await new Promise((resolve) => setTimeout(resolve, 350));

  const image = await window.webContents.capturePage();
  await fs.mkdir(path.join(__dirname, "..", "docs"), { recursive: true });
  await fs.writeFile(path.join(__dirname, "..", "docs", "screenshot.png"), image.toPNG());
  window.close();
}

app.whenReady().then(captureScreenshot).then(() => app.quit());
