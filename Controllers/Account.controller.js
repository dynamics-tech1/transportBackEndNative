const ServerResponder = require("../Utils/ServerResponder");
const AccountService = require("../Services/Account.service");
const { executeInTransaction } = require("../Utils/DatabaseTransaction");

// GET /api/account/status
// Supports: ownerUserUniqueId, phoneNumber, or email as query parameters
const accountStatus = async (req, res, next) => {
  try {
    let user = req?.user;
    const userUniqueId = user?.userUniqueId;
    let ownerUserUniqueId = req?.query?.ownerUserUniqueId;
    const phoneNumber = req?.query?.phoneNumber;
    const email = req?.query?.email;
    let enableDocumentChecks = req?.query?.enableDocumentChecks;

    // Priority: ownerUserUniqueId > phoneNumber > email > self
    if (!ownerUserUniqueId || ownerUserUniqueId === "self") {
      if (phoneNumber || email) {
        // Will be resolved in service by phone/email
        ownerUserUniqueId = null;
        user = null;
      } else {
        ownerUserUniqueId = userUniqueId;
        req.roleId = user?.roleId;
      }
    } else {
      user = null;
    }

    const result = await executeInTransaction(async (connection) => {
      return await AccountService?.accountStatus({
        ownerUserUniqueId,
        phoneNumber,
        email,
        user,
        body: req?.query || {},
        enableDocumentChecks,
        connection, // Pass connection for transaction support
      });
    });

    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  accountStatus,
};
