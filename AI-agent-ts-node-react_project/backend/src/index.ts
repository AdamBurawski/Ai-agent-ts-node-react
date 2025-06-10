import App from "./app";

const app = new App();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing connections...");
  await app.closeConnections();
  process.exit(0);
});

app.listen();
