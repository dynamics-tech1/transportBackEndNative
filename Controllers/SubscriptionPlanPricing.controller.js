const service = require("../Services/SubscriptionPlanPricing.service");
const { currentDate } = require("../Utils/CurrentDate");
const ServerResponder = require("../Utils/ServerResponder");

// Create
exports.createPricing = async (req, res, next) => {
  try {
    const {
      subscriptionPlanUniqueId,
      price,
      durationInDays,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    const result = await service.createPricing(
      subscriptionPlanUniqueId,
      price,
      durationInDays,
      effectiveFrom,
      effectiveTo,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Single GET endpoint with comprehensive filtering
exports.getPricingWithFilters = async (req, res, next) => {
  try {
    // Extract all possible filter parameters from query string
    const {
      subscriptionPlanPricingUniqueId,
      subscriptionPlanUniqueId,
      subscriptionPlanId,
      planName,
      description,
      price,
      effectiveFrom,
      effectiveTo,
      createdAt,
      date, // For active pricing checks
      isActive, // true/false to get active/inactive pricing
      sortBy = " SubscriptionPlanPricing.subscriptionPlanPricingCreatedAt ",
      sortOrder = "DESC",
      page = 1,
      limit = 10,
      isFree,
    } = req.query;

    // Build filter object
    const filters = {
      subscriptionPlanPricingUniqueId,
      subscriptionPlanUniqueId,
      subscriptionPlanId,
      planName,
      description,
      price,
      effectiveFrom,
      effectiveTo,
      createdAt,
      date: date || currentDate(), // Default to today
      isActive:
        isActive === undefined
          ? undefined
          : String(isActive).toLowerCase() === "true",
      sortBy,
      sortOrder: sortOrder.toUpperCase(),
      page: parseInt(page),
      limit: parseInt(limit),
      isFree:
        isFree === undefined
          ? undefined
          : String(isFree).toLowerCase() === "true"
            ? 1
            : String(isFree).toLowerCase() === "false"
              ? 0
              : isFree,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === "") {
        delete filters[key];
      }
    });

    const result = await service.getPricingWithFilters(filters);
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Update by unique pricing ID
exports.updatePricingByUniqueId = async (req, res, next) => {
  try {
    const { subscriptionPlanPricingUniqueId } = req.params;
    const {
      price,
      durationInDays,
      effectiveFrom,
      effectiveTo,
      subscriptionPlanUniqueId,
    } = req.body;
    const updatedBy = req.user?.userUniqueId;

    const result = await service.updatePricingByUniqueId(
      subscriptionPlanPricingUniqueId,
      {
        price,
        durationInDays,
        effectiveFrom,
        effectiveTo,
        subscriptionPlanUniqueId,
      },
      updatedBy,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};

// Delete by unique pricing ID
exports.deletePricingByUniqueId = async (req, res, next) => {
  try {
    const { subscriptionPlanPricingUniqueId } = req.params;
    const result = await service.deletePricingByUniqueId(
      subscriptionPlanPricingUniqueId,
    );
    ServerResponder(res, result);
  } catch (error) {
    next(error);
  }
};
