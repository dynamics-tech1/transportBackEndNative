const { pool } = require("../Middleware/Database.config");
const { v4: uuidv4 } = require("uuid");
const { updateUserRoleStatus } = require("./UserRoleStatus.service");
const { accountStatus } = require("./Account.service");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");

const query = async (sql, values = []) => {
  const [result] = await pool.query(sql, values);
  return result;
};

const banUser = async (data) => {
  const { userDelinquencyUniqueId, bannedBy, banReason, banDurationDays } =
    data;

  // fetch user phone and role by userDelinquencyUniqueId and validate existence
  const [userInfoRows] = await pool.query(
    `SELECT u.phoneNumber, ur.roleId
     FROM UserDelinquency ud
     INNER JOIN UserRole ur ON ud.userRoleUniqueId = ur.userRoleUniqueId
     INNER JOIN Users u ON ur.userUniqueId = u.userUniqueId
     WHERE ud.userDelinquencyUniqueId = ?`,
    [userDelinquencyUniqueId],
  );

  if (userInfoRows.length === 0) {
    throw new AppError("Invalid userDelinquencyUniqueId", 400);
  }
  const { phoneNumber, roleId } = userInfoRows[0];

  const [existingActiveBanRows] = await pool.query(
    `SELECT b.* FROM BannedUsers b 
     WHERE b.userDelinquencyUniqueId = ? 
       AND b.isActive = TRUE 
       AND (b.banExpiresAt IS NULL OR b.banExpiresAt > ?) 
     LIMIT 1`,
    [userDelinquencyUniqueId, currentDate()],
  );
  if (existingActiveBanRows.length > 0) {
    throw new AppError("User already has an active ban", 409);
  }

  const banUniqueId = uuidv4();
  const banAt = currentDate();
  const banExpiresAt = new Date(
    banAt.getTime() + banDurationDays * 24 * 60 * 60 * 1000,
  );

  const sql = `
    INSERT INTO BannedUsers (
      banUniqueId,   userDelinquencyUniqueId,
      bannedBy, banReason, banDurationDays, banExpiresAt
    ) VALUES (?, ?, ?, ?, ?,  ?)
  `;

  const values = [
    banUniqueId,

    userDelinquencyUniqueId,
    bannedBy,
    banReason,
    banDurationDays,
    banExpiresAt,
  ];

  await query(sql, values);
  // change user role status to banned which is 6
  await updateUserRoleStatus({
    user: { userUniqueId: bannedBy },
    roleId,
    newStatusId: 6,
    phoneNumber,
  });

  return {
    message: "success",
    data: "User role banned successfully",
    banUniqueId,
    banExpiresAt,
  };
};

const getBannedUsers = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    userRoleUniqueId,
    banUniqueId,
    bannedBy,
    isActive,
    startDate,
    endDate,
    sortBy = "banAt",
    sortOrder = "DESC",
    roleId,
    search, // Added search parameter
  } = filters;

  const offset = (page - 1) * limit;

  let whereConditions = ["1 = 1"];
  let queryParams = [];

  if (userRoleUniqueId) {
    whereConditions.push("ur.userRoleUniqueId = ?");
    queryParams.push(userRoleUniqueId);
  }

  if (banUniqueId) {
    whereConditions.push("bu.banUniqueId = ?");
    queryParams.push(banUniqueId);
  }

  if (bannedBy) {
    whereConditions.push("bu.bannedBy = ?");
    queryParams.push(bannedBy);
  }

  if (isActive !== undefined) {
    whereConditions.push("bu.isActive = ?");
    queryParams.push(isActive === "true" ? 1 : 0);
  }

  if (startDate) {
    whereConditions.push("bu.banAt >= ?");
    queryParams.push(startDate);
  }

  if (endDate) {
    whereConditions.push("bu.banAt <= ?");
    queryParams.push(endDate);
  }

  if (roleId) {
    let roleIds = roleId;
    if (typeof roleIds === "string" && roleIds.includes(",")) {
      roleIds = roleIds.split(",").map((id) => id.trim());
    }

    if (Array.isArray(roleIds)) {
      const placeholders = roleIds.map(() => "?").join(",");
      whereConditions.push(`ur.roleId IN (${placeholders})`);
      queryParams.push(...roleIds);
    } else {
      whereConditions.push("ur.roleId = ?");
      queryParams.push(roleIds);
    }
  }

  // SEARCH BLOCK - Search across multiple fields
  if (search) {
    whereConditions.push(`(
      u.fullName LIKE ? OR 
      u.phoneNumber LIKE ? OR 
      u.email LIKE ? OR
      ub.fullName LIKE ? OR
      r.roleName LIKE ? OR
      dt.delinquencyTypeName LIKE ? OR
      ud.delinquencyDescription LIKE ? OR
      bu.banReason LIKE ?
    )`);

    const searchPattern = `%${search}%`;
    // Add the same pattern for all 8 search conditions
    queryParams.push(
      searchPattern, // u.fullName
      searchPattern, // u.phoneNumber
      searchPattern, // u.email
      searchPattern, // ub.fullName (banned by user name)
      searchPattern, // r.roleName
      searchPattern, // dt.delinquencyTypeName
      searchPattern, // ud.delinquencyDescription
      searchPattern, // bu.banReason
    );
  }

  const baseQuery = `
    SELECT 
      bu.*,  u.*,  r.*,
      ub.fullName as bannedByName,
      ud.delinquencyTypeUniqueId,
      dt.delinquencyTypeName,
      ud.delinquencyDescription,
      -- UserRoleStatusCurrent fields
      ursc.userRoleStatusId,
      ursc.userRoleStatusUniqueId,
      ursc.statusId as currentStatusId,
      ursc.userRoleStatusDescription,
      ursc.userRoleStatusCreatedBy,
      ursc.userRoleStatusCreatedAt,
      ursc.userRoleStatusCurrentVersion,
      -- Status fields for current status
      s.statusName as currentStatusName,
      s.statusDescription as currentStatusDescription
    FROM BannedUsers bu
    INNER JOIN UserDelinquency ud ON bu.userDelinquencyUniqueId = ud.userDelinquencyUniqueId
    INNER JOIN UserRole ur ON ud.userUniqueId = ur.userUniqueId and ur.roleId = ud.roleId
    INNER JOIN Users u ON ur.userUniqueId = u.userUniqueId
    INNER JOIN Roles r ON ur.roleId = r.roleId
    INNER JOIN Users ub ON bu.bannedBy = ub.userUniqueId
    INNER JOIN DelinquencyTypes dt ON ud.delinquencyTypeUniqueId = dt.delinquencyTypeUniqueId
    -- LEFT JOIN with UserRoleStatusCurrent to get current status (may not exist for banned users)
    LEFT JOIN UserRoleStatusCurrent ursc ON ur.userRoleId = ursc.userRoleId
    LEFT JOIN Statuses s ON ursc.statusId = s.statusId
    WHERE ${whereConditions.join(" AND ")}
  `;

  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_table`;
  const dataQuery = `
    ${baseQuery}
    ORDER BY bu.${sortBy} ${sortOrder === "DESC" ? "DESC" : "ASC"}
    LIMIT ? OFFSET ?
  `;

  const dataQueryParams = [...queryParams, parseInt(limit), offset];

  const [countResult] = await pool.query(countQuery, queryParams);
  const [results] = await pool.query(dataQuery, dataQueryParams);

  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    message: "success",
    data: results,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    filters,
  };
};

const updateBannedUser = async (banUniqueId, data) => {
  const { banReason, banDurationDays, banExpiresAt } = data;

  const sql = `
    UPDATE BannedUsers 
    SET banReason = ?, banDurationDays = ?, banExpiresAt = ?
    WHERE banUniqueId = ?
  `;

  const values = [banReason, banDurationDays, banExpiresAt, banUniqueId];
  const result = await query(sql, values);

  if (result.affectedRows > 0) {
    return {
      message: "success",
      data: "Banned user record updated successfully",
    };
  } else {
    throw new AppError("Failed to update banned user record", 500);
  }
};

const unbanUser = async (query) => {
  try {
    const { banUniqueId, phoneNumber, roleId, newStatusId } = query;
    // validate all query
    if (!banUniqueId || !phoneNumber || !roleId || !newStatusId) {
      throw new AppError("all fields are required", 400);
    }
    const sql = "update   BannedUsers set isActive=? WHERE banUniqueId = ?";
    const [updatedBanResult] = await pool.query(sql, [false, banUniqueId]);

    const { getUserByFilterDetailed } = require("./User.service");
    const filters = { phoneNumber };
    const userData = await getUserByFilterDetailed(filters);
    const ownerUserUniqueId = userData?.data?.[0]?.user?.userUniqueId;

    await accountStatus({ ownerUserUniqueId, body: { roleId } });

    if (updatedBanResult.affectedRows > 0) {
      return { message: "success", data: "User unbanned successfully" };
    } else {
      throw new AppError("Failed to unBan user", 500);
    }
  } catch (error) {
    const logger = require("../Utils/logger");
    logger.error("Error unbanning user", {
      error: error.message,
      stack: error.stack,
    });
    throw new AppError("Failed to unBan user", 500);
  }
};

const deactivateBan = async (banUniqueId) => {
  const sql = "UPDATE BannedUsers SET isActive = FALSE WHERE banUniqueId = ?";
  const result = await query(sql, [banUniqueId]);
  if (result.affectedRows > 0) {
    return { message: "success", data: "Ban deactivated successfully" };
  } else {
    throw new AppError("Failed to deactivate ban", 500);
  }
};

module.exports = {
  banUser,
  getBannedUsers,
  updateBannedUser,
  unbanUser,
  deactivateBan,
};
