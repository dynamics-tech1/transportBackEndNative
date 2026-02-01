const killPort = require("kill-port");
const logger = require("./Utils/logger");
// Use your app's port. 3000 is just an example.
const port = process.env.PORT || 3000;

killPort(port, "tcp")
  .then(() => {
    // Now, require your main application file
    require("./App.js"); // Change this to your main file (e.g., app.js, index.js)
  })
  .catch((err) => {
    logger.warn("Error killing port, continuing anyway", { port, error: err.message, stack: err.stack });
    require("./App.js");
  });
