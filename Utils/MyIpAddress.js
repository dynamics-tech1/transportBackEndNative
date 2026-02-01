const os = require("os");

const getLocalIpAddress = () => {
  try {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];

      for (const address of addresses) {
        if (address.family === "IPv4" && !address.internal) {
          return address.address; // Return the first external IPv4 address
        }
      }
    }

    return "Unable to determine IP address";
  } catch (error) {
    // Handle permission errors or other system errors gracefully
    console.warn("Warning: Could not get network interfaces:", error.message);
    return "localhost"; // Fallback to localhost
  }
};

// Only call this at module level if needed, otherwise remove this line
// const ipAddress = getLocalIpAddress();
// console.log("ipAddress", ipAddress);
module.exports = getLocalIpAddress;
