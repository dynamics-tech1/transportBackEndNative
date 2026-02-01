const path = require("path");
// import uuidv4
const { v4: uuidv4 } = require("uuid");
const {
  updateAttachedDocument,
  createAttachedDocument,
} = require("../Services/AttachedDocuments.service");
const services = require("../Services/User.service");
const { uploadToFTP } = require("../Utils/FTPHandler");
const ServerResponder = require("../Utils/ServerResponder");

const AppError = require("../Utils/AppError");

const createUser = async (req, res, next) => {
  try {
    const response = await services.createUser(req?.body);
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const payload =
      req.body && Object.keys(req.body).length ? req.body : req.query;

    const response = await services?.loginUser(
      payload?.phoneNumber,
      payload?.roleId !== null ? Number(payload.roleId) : payload?.roleId,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const verifyUserByOTP = async (req, res, next) => {
  try {
    ServerResponder(res, await services.verifyUserByOTP(req));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = req.user;
    const deletedBy = user?.userUniqueId;
    const roleId = user.roleId;

    //user must be either 3=admin or 6=supperAdmin or itself
    if (roleId !== 3 && roleId !== 6 && deletedBy !== req.params.userUniqueId) {
      throw new AppError("you can't delete this user", 403);
    }

    const response = await services.deleteUser({
      userUniqueId: req.params.userUniqueId,
      deletedBy,
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const getUserByFilterDetailed = async (req, res, next) => {
  try {
    const userUniqueId = req?.query?.userUniqueId;
    if (userUniqueId === "self") {
      req.query.userUniqueId = req?.user?.userUniqueId;
    }

    // Accept filters via query string, and optional pagination
    const filters = req.query || {};
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    // include role/status information by default (do not expect includeRoles from client)
    const response = await services.getUserByFilterDetailed(
      filters,
      page,
      limit,
    );
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = req?.user;
    const userUniqueId = user?.userUniqueId;
    // self means the user is updating himself,so userUniqueId is the same as ownerUserUniqueId
    const ownerUserUniqueId =
      req?.params?.ownerUserUniqueId === "self"
        ? userUniqueId
        : req?.params?.ownerUserUniqueId;
    const roleId = user?.roleId;
    const body = { ...req.body, userUniqueId: ownerUserUniqueId, roleId };

    // Initialize response tracker
    const updateResponses = { textUpdate: "success", fileUpdate: "success" };

    // Update user text information
    const textResponse = await services.updateUser(body);
    updateResponses.textUpdate = textResponse.message;

    // Handle file upload if files are provided
    if (req.files && req.files.length > 0) {
      const {
        attachedDocumentUniqueId,
        profilePhotoTypeId,
        ProfilePhotoDescription,
        ProfilePhotoExpirationDate,
      } = body;

      // --- FTP UPLOAD LOGIC ---
      const file = req.files[0]; // Get the first uploaded file

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${user.userId}_${uuidv4()}${fileExtension}`;

      let fileUrl; // Variable to store the FTP file URL

      try {
        // Upload to FTP server - pass the buffer and unique filename
        fileUrl = await uploadToFTP(file.buffer, uniqueFilename);
      } catch {
        // If FTP upload fails, respond with error but text update may have succeeded
        return ServerResponder(res, {
          message: "partial_success",
          error:
            "User information updated, but failed to upload profile image to server.",
        });
      }
      // --- END FTP UPLOAD LOGIC ---

      // Validate attachedDocumentUniqueId
      if (
        !attachedDocumentUniqueId ||
        attachedDocumentUniqueId === "undefined" ||
        attachedDocumentUniqueId === "null"
      ) {
        // Create a new attached document with FTP URL
        const fileResponse = await createAttachedDocument({
          attachedDocumentDescription: ProfilePhotoDescription,
          attachedDocumentName: fileUrl, // Use the FTP URL instead of local path
          documentTypeId: profilePhotoTypeId,
          documentExpirationDate: ProfilePhotoExpirationDate,
          roleId: user.roleId,
          user,
          userUniqueId: ownerUserUniqueId,
        });

        updateResponses.fileUpdate = fileResponse.message;
      } else {
        // Update the existing attached document with new FTP URL
        const fileResponse = await updateAttachedDocument(
          attachedDocumentUniqueId,
          user,
          body,
          [fileUrl], // Pass the new URL to the update function
        );

        updateResponses.fileUpdate = fileResponse.message;
      }
    } else {
      updateResponses.fileUpdate = "success";
    }

    // Consolidate response based on update results
    const { textUpdate, fileUpdate } = updateResponses;

    if (textUpdate === "success" && fileUpdate === "success") {
      return ServerResponder(res, textResponse); // Both updates successful
    }

    if (textUpdate === "success" && fileUpdate === "error") {
      return ServerResponder(res, {
        message: "partial_success",
        error: "User information updated, but failed to update profile image.",
      });
    }

    if (textUpdate === "error" && fileUpdate === "success") {
      return ServerResponder(res, {
        message: "partial_success",
        error: "Profile image updated, but failed to update user information.",
      });
    }

    throw new AppError(
      "Failed to update both user information and profile image.",
      500,
    );
  } catch (error) {
    next(error);
  }
};

const createUserByAdminOrSuperAdmin = async (req, res, next) => {
  try {
    const response = await services.createUserByAdminOrSuperAdmin({
      body: req.body,
      userUniqueId: req?.user?.userUniqueId,
    });
    ServerResponder(res, response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUserByAdminOrSuperAdmin,
  updateUser,
  verifyUserByOTP,
  createUser,
  deleteUser,
  getUserByFilterDetailed,
  loginUser,
};
