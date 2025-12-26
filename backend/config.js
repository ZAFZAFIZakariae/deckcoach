require('dotenv').config();  // Load .env file

module.exports = {
  CR_API_TOKEN: process.env.CR_API_TOKEN || "<YOUR_API_TOKEN>",
  CR_API_BASE_URL: "https://api.clashroyale.com/v1"
};
