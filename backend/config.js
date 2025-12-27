require('dotenv').config();  // Load .env file

module.exports = {
  CR_API_TOKEN: process.env.CR_TOKEN || process.env.CR_API_TOKEN || "<YOUR_API_TOKEN>",
  CR_API_BASE_URL: "https://api.clashroyale.com/v1",
  CR_API_TIMEOUT_MS: Number.parseInt(process.env.CR_API_TIMEOUT_MS, 10) || 15000
};
