/**
 * dev 서버 기동 후 브라우저를 자동으로 엽니다.
 * concurrently로 next dev와 함께 실행됩니다.
 */
const url = "http://localhost:3000";
const delayMs = 2500;

setTimeout(() => {
  const { exec } = require("child_process");
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn("브라우저 열기 실패:", err.message);
  });
}, delayMs);
