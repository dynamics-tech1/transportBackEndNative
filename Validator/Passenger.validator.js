const { pool } = require("../Middleware/Database.config");
const AppError = require("../Utils/AppError");

const verifyExistanceOfPassangerInWaitingStage = async (userUniqueId) => {
  // Query to check existence in the passenger table
  const passengerSql = `SELECT * FROM Users WHERE userUniqueId = ?`;
  const passengerValues = [userUniqueId];
  const [passengerResult] = await pool.query(passengerSql, passengerValues);

  if (passengerResult.length === 0) {
    throw new AppError("passenger not found", 404);
  }

  // Query to check existence in the PassengerRequest table
  const requestSql = `SELECT * FROM PassengerRequest WHERE userUniqueId = ? AND userJourneyStatusId IN ('1', '2', '3','4')`;
  const requestValues = [userUniqueId];
  const [requestResult] = await pool.query(requestSql, requestValues);

  // Combine the results (if necessary) or return the request results directly
  if (requestResult.length > 0) {
    return {
      status: "success",
      passenger: { ...requestResult[0], ...passengerResult[0] },
      data: "passenger is in waiting stage",
    };
  } else {
    return {
      status: "success",
      passenger: { ...passengerResult[0] },
      data: "passenger is not in waiting stage",
    };
  }
};

module.exports = { verifyExistanceOfPassangerInWaitingStage };
