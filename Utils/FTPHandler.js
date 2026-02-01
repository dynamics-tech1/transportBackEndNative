// // utils/ftpUploader.js
// const ftp = require("basic-ftp");
// const path = require("path");

// const ftpConfig = {
//   host: process.env.FTP_HOST, // your-domain.com
//   user: process.env.FTP_USER, // your cPanel username
//   password: process.env.FTP_PASSWORD, // your FTP password
//   secure: false, // use FTPS
// };

// async function uploadToFTP(buffer, filename) {
//   const client = new ftp.Client();

//   try {
//     await client.access(ftpConfig);

//     // Change to your public_html directory or subfolder
//     await client.ensureDir("/uploads");

//     // Upload the file buffer
//     await client.uploadFrom(buffer, filename);

//     // Return the public URL
//     return process.env.FTP_HOST + "/" + filename;
//   } catch (error) {
//     throw new Error(`FTP upload failed: ${error.message}`);
//   } finally {
//     client.close();
//   }
// }

// module.exports = { uploadToFTP };
const ftp = require("basic-ftp");
const { Readable } = require("stream"); // Add this import

const ftpConfig = {
  host: process.env.FTP_HOST, //"ftp.masetawosha.com",
  user: process.env.FTP_USER, // "vercelFiles@transport.masetawosha.com",
  password: process.env.FTP_PASSWORD, // process.env.FTP_PASSWORD,
  port: 21,
  secure: true,
  secureOptions: {
    rejectUnauthorized: false,
  },
};

async function uploadToFTP(buffer, filename) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access(ftpConfig);

    // await client.ensureDir("public_html/uploads");

    // Convert buffer to readable stream
    const readableStream = Readable.from(buffer);

    // Upload the file
    await client.uploadFrom(readableStream, filename);

    const fileUrl = `${process.env.FTP_UPLOADS_PATH + filename}`;

    return fileUrl;
  } catch (error) {
    throw new Error(`FTP upload failed: ${error.message}`);
  } finally {
    client.close();
  }
}
async function deleteFromFTP(filename) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access(ftpConfig);

    try {
      await client.size(filename);
    } catch (error) {
      const logger = require("./logger");
      logger.debug("File does not exist on FTP server", {
        filename,
        error: error.message,
      });
      return { success: true, message: "File already does not exist" };
    }

    await client.remove(filename);

    return { success: true, message: "File deleted successfully" };
  } catch (error) {
    throw new Error(`FTP deletion failed: ${error.message}`);
  } finally {
    client.close();
  }
}

module.exports = { deleteFromFTP, uploadToFTP };
