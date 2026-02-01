const { pool } = require("../Middleware/Database.config");
const { journeyStatusMap } = require("./ListOfSeedData");
//exclude previously rejected passenger requests by driver (rejectedByDriver), cancelled by driver (cancelledByDriver), cancelled by admin (cancelledByAdmin), rejected by passenger (rejectedByPassenger), or by system
const VerifyIfPassengerRequestWasNotRejected = async ({
  passengerRequestId,
  driverUserUniqueId,
}) => {
  const sql = `Select * from JourneyDecisions join DriverRequest on JourneyDecisions.driverRequestId = DriverRequest.driverRequestId where JourneyDecisions.passengerRequestId = ? and DriverRequest.userUniqueId = ? and (JourneyDecisions.journeyStatusId = ? or JourneyDecisions.journeyStatusId = ? or JourneyDecisions.journeyStatusId = ? or JourneyDecisions.journeyStatusId = ?)`;

  const [result] = await pool.query(sql, [
    passengerRequestId,
    driverUserUniqueId,
    journeyStatusMap.cancelledByDriver,
    journeyStatusMap.rejectedByPassenger,
    journeyStatusMap.rejectedByDriver,
    journeyStatusMap.cancelledByAdmin,
  ]);
  if (result.length === 0) {
    return { message: "success", status: 1, data: result };
  } else {
    return {
      message: "error",
      error:
        "Passenger request was rejected by the driver, cancelled by the driver, or cancelled by admin",
    };
  }
};
const VerifyIfDriverDidNotRejectPassengersRequest = async ({
  passengerRequestId,
  driverUserUniqueId,
}) => {
  const sql = `Select * from JourneyDecisions join PassengerRequest on JourneyDecisions.passengerRequestId = PassengerRequest.passengerRequestId where JourneyDecisions.driverRequestId = ? and PassengerRequest.userUniqueId = ? and (JourneyDecisions.journeyStatusId = ? or JourneyDecisions.journeyStatusId = ?)`;

  const [result] = await pool.query(sql, [
    driverUserUniqueId,
    passengerRequestId,
    journeyStatusMap.cancelledByPassenger,
    journeyStatusMap.rejectedByDriver,
  ]);
  if (result.length === 0) {
    return { message: "success", status: 1 };
  } else {
    return {
      message: "error",
      error:
        "Driver request was rejected by the passenger or cancelled by the passenger",
    };
  }
};
module.exports = {
  VerifyIfPassengerRequestWasNotRejected,
  VerifyIfDriverDidNotRejectPassengersRequest,
};
