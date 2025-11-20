/**
 * Starts Next.js dev server and exposes it via ngrok for MiniPay testing.
 * Requires NGROK_AUTH_TOKEN or NGROK_AUTHTOKEN in environment (ngrok v5+).
 */
const { spawn } = require("child_process");
const ngrok = require("ngrok");

async function main() {
  // Check for auth token (support both naming conventions)
  const authToken = process.env.NGROK_AUTH_TOKEN || process.env.NGROK_AUTHTOKEN;
  
  if (!authToken) {
    console.error("❌ Error: NGROK_AUTH_TOKEN not found in environment variables.");
    console.error("\nTo use ngrok:");
    console.error("1. Sign up at https://dashboard.ngrok.com/signup");
    console.error("2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken");
    console.error("3. Set it in your .env file: NGROK_AUTH_TOKEN=your_token_here");
    console.error("\nAlternatively, you can run the dev server without ngrok:");
    console.error("  npm run dev");
    process.exit(1);
  }

  const port = process.env.PORT || 3000;
  
  // Start dev server
  console.log("🚀 Starting Next.js dev server...");
  const devServer = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });

  devServer.on("close", (code) => {
    console.log(`Dev server exited with code ${code}`);
    process.exit(code);
  });

  // Wait a bit for dev server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log("🌐 Starting ngrok tunnel...");
    const url = await ngrok.connect({
      addr: port,
      authtoken: authToken,
      proto: "http"
    });

    console.log("\n✅ Ngrok tunnel established!");
    console.log(`📱 MiniPay test URL: ${url}`);
    console.log("💡 Load this URL inside MiniPay developer mode to test the dApp.\n");
  } catch (err) {
    console.error("\n❌ Failed to start ngrok tunnel:");
    console.error(err.message || err);
    
    if (err.body) {
      console.error("\nError details:", err.body);
    }
    
    console.error("\nTroubleshooting:");
    console.error("1. Verify your NGROK_AUTH_TOKEN is correct");
    console.error("2. Check your internet connection");
    console.error("3. Try running: ngrok http 3000 (if ngrok CLI is installed)");
    console.error("4. Check ngrok status: https://status.ngrok.com/");
    
    // Don't exit - let dev server keep running
    console.error("\n⚠️  Dev server is still running at http://localhost:3000");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

