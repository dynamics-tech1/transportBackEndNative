const { pool } = require("../Middleware/Database.config");
const AppError = require("../Utils/AppError");
const { currentDate } = require("../Utils/CurrentDate");

// Create a new rating
exports.createRating = async ({
  journeyDecisionUniqueId,
  ratedBy,
  rating,
  comment,
}) => {
  try {
    // before insert first check availability of Ratings before via journeyDecisionUniqueId,
    const checkAvailability = await exports.getAllRatings({
      journeyDecisionUniqueId,
      limit: 1,
    });
    if (
      checkAvailability &&
      checkAvailability.data &&
      checkAvailability.data.ratings.length > 0
    ) {
      throw new AppError("Rating already exists for this journey", 400);
    }
    const sql = `INSERT INTO Ratings (journeyDecisionUniqueId, ratedBy, rating, comment,ratingCreatedBy,ratingCreatedAt) VALUES (?, ?, ?, ?,?,?)`;
    const values = [
      journeyDecisionUniqueId,
      ratedBy,
      rating,
      comment,
      ratedBy,
      currentDate(),
    ];
    const [result] = await pool.query(sql, values);

    return {
      message: "success",
      data: {
        journeyDecisionUniqueId,
        ratedBy,
        rating,
        comment,
        ratingId: result.insertId,
      },
    };
  } catch (error) {
    throw new AppError(
      error.message || "Unable to create rating",
      error.statusCode || 500,
    );
  }
};

// Get all ratings with pagination and filtering
exports.getAllRatings = async ({
  page = 1,
  limit = 10,
  search = "",
  searchBy = "",
  journeyDecisionUniqueId = "",
}) => {
  const offset = (page - 1) * limit;

  let whereClause = "";
  const params = [];

  // Always include JOIN since we're selecting user columns
  const joinClause = `LEFT JOIN Users u ON r.ratedBy = u.userUniqueId`;

  // Add WHERE clause if search is provided
  if (journeyDecisionUniqueId) {
    whereClause = `WHERE r.journeyDecisionUniqueId = ?`;
    params.push(journeyDecisionUniqueId);
  } else if (searchBy) {
    // Search by specific field
    switch (searchBy) {
    case "phone":
      whereClause = `WHERE u.phoneNumber LIKE ?`;
      params.push(`%${search}%`);
      break;
    case "email":
      whereClause = `WHERE u.email LIKE ?`;
      params.push(`%${search}%`);
      break;
    case "name":
      whereClause = `WHERE u.fullName LIKE ?`;
      params.push(`%${search}%`);
      break;
    }
  } else if (search) {
    // Default search across all fields when searchBy is not specified
    whereClause = `WHERE (u.phoneNumber LIKE ? OR u.email LIKE ? OR u.fullName LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Get total count for pagination
  const countSql = `SELECT COUNT(*) as total FROM Ratings r ${joinClause} ${whereClause}`;
  const [countResult] = await pool.query(countSql, params);
  const total = countResult[0].total;

  // Get paginated results - basic query without user columns first
  const dataSql = `
    SELECT 
      r.ratingId,
      r.journeyDecisionUniqueId,
      r.ratedBy,
      r.rating,
      r.comment
    FROM Ratings r 
    ${joinClause} 
    ${whereClause} 
    ORDER BY r.ratingId DESC 
    LIMIT ? OFFSET ?
  `;

  const dataParams = [
    ...params,
    Number.parseInt(limit),
    Number.parseInt(offset),
  ];
  const [result] = await pool.query(dataSql, dataParams);

  return {
    message: "success",
    data: {
      ratings: result,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number.parseInt(limit),
      },
    },
  };
};

// Get a specific rating by ID
exports.getRatingById = async (ratingId) => {
  const sql = `
    SELECT 
      r.ratingId,
      r.journeyDecisionUniqueId,
      r.ratedBy,
      r.rating,
      r.comment,
      u.fullName,
      u.phoneNumber,
      u.email
    FROM Ratings r
    LEFT JOIN Users u ON r.ratedBy = u.userUniqueId
    WHERE r.ratingId = ?
  `;
  const [result] = await pool.query(sql, [ratingId]);

  if (result.length > 0) {
    return { message: "success", data: result[0] };
  }
  throw new AppError("Rating not found", 404);
};

// Update a specific rating by ID
exports.updateRating = async (ratingId, rating, comment, updatedBy) => {
  const sql = `UPDATE Ratings SET rating = ?, comment = ?, ratingUpdatedBy = ?, ratingUpdatedAt = ? WHERE ratingId = ?`;
  const values = [rating, comment, updatedBy, currentDate(), ratingId];
  const [result] = await pool.query(sql, values);

  if (result.affectedRows > 0) {
    return {
      message: "success",
      data: { ratingId, rating, comment, updatedBy },
    };
  } else {
    throw new AppError("Failed to update rating", 500);
  }
};

// Delete a specific rating by ID (Soft Delete)
exports.deleteRating = async (ratingId, deletedBy) => {
  const sql = `UPDATE Ratings SET isDeleted = 1, ratingDeletedBy = ?, ratingDeletedAt = ? WHERE ratingId = ?`;
  const values = [deletedBy, currentDate(), ratingId];
  const [result] = await pool.query(sql, values);

  if (result.affectedRows > 0) {
    return {
      message: "success",
      data: `Rating with ID ${ratingId} deleted successfully`,
    };
  } else {
    throw new AppError("Failed to delete rating", 500);
  }
};
