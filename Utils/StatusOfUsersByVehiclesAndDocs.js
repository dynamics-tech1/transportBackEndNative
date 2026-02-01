const findStatusByVehicleAndDocuments = (data) => {
  const {
    vehicleRegistered,
    attachedDocumentsByStatus,
    requiredDocuments,
    unAttachedDocumentTypes,
    // new flags
    isBanned = false,
    hasActiveSubscription = true,
  } = data;

  // Validate essential input
  if (typeof vehicleRegistered !== "boolean") {
    const AppError = require("./AppError");
    throw new AppError("Invalid input: vehicleRegistered.", 400);
  }
  //
  const requiredCount = requiredDocuments?.length || 0;

  // Fix: Count unique document types that have at least one ACCEPTED document
  const acceptedDocTypes = new Set(
    attachedDocumentsByStatus?.ACCEPTED?.map((doc) => doc.documentTypeId) || [],
  );
  const acc = acceptedDocTypes.size;

  const pend = attachedDocumentsByStatus?.PENDING?.length || 0;
  const rej = attachedDocumentsByStatus?.REJECTED?.length || 0;
  const missingRequired = (unAttachedDocumentTypes?.length || 0) > 0;

  // Global priority overrides
  // 6) banned: kept for administrative actions - overrides everything
  if (isBanned === true) {
    return { message: "success", finalStatusId: 6 };
  }

  // If no required documents are defined, status relies on vehicle only
  if (requiredCount === 0) {
    return {
      message: "success",
      // 2) no vehicle overrides when no docs logic exists
      finalStatusId: vehicleRegistered
        ? hasActiveSubscription
          ? 1 // active
          : 7 // no subscription
        : 2, // no vehicle
    };
  }

  // Priority order per requirements:

  // 2) no vehicle: regardless of documents
  if (!vehicleRegistered) {
    return { message: "success", finalStatusId: 2 };
  }

  // 7) no subscription: driver doesn't have a subscription
  if (hasActiveSubscription === false) {
    return { message: "success", finalStatusId: 7 };
  }

  // 4) rejected: any rejected document exists
  if (rej > 0) {
    return { message: "success", finalStatusId: 4 };
  }

  // 3) not attached doc: some required docs are missing
  if (missingRequired) {
    return { message: "success", finalStatusId: 3 };
  }

  // 5) pending: any pending and none rejected
  if (pend > 0) {
    return { message: "success", finalStatusId: 5 };
  }
  // 1) active: vehicle registered AND all required docs accepted
  if (vehicleRegistered && acc >= requiredCount) {
    // Ensure subscription is active, otherwise override to 7
    return {
      message: "success",
      finalStatusId: hasActiveSubscription ? 1 : 7,
    };
  }

  // Fallback: if all accepted but vehicle not registered would have matched #2 above.
  // If inputs don't fit any case, return error for visibility.
  const AppError = require("./AppError");
  throw new AppError(
    "Unable to determine driver's status with provided data.",
    400,
  );
};
module.exports = { findStatusByVehicleAndDocuments };
