const AppError = require("../Utils/AppError");
const { getData } = require("../CRUD/Read/ReadData");

const toCamelCase = (str) => {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/(?:^\w|\b\w)/g, (match, index) =>
      index === 0 ? match.toLowerCase() : match.toUpperCase(),
    )
    .replace(/\s+/g, "");
};

const checkDocumentTypeExists = async (req, res, next) => {
  try {
    const documentTypeName = req?.body?.documentTypeName;

    if (!documentTypeName) {
      return next();
    }

    const camelCaseDocumentName = toCamelCase(documentTypeName);
    const uploadedDocumentName = camelCaseDocumentName;
    const uploadedDocumentTypeId = camelCaseDocumentName + "TypeId";

    const byName = await getData({
      tableName: "DocumentTypes",
      conditions: { documentTypeName },
    });

    if (byName?.length > 0) {
      return next(
        new AppError(
          {
            message: "Document type already exists",
            code: "DOCUMENT_TYPE_ALREADY_EXISTS",
            details: [{ field: "documentTypeName", message: "Already exists" }],
          },
          400,
        ),
      );
    }

    const byUploadedName = await getData({
      tableName: "DocumentTypes",
      conditions: { uploadedDocumentName },
    });

    if (byUploadedName?.length > 0) {
      return next(
        new AppError(
          {
            message: "Document type already exists",
            code: "DOCUMENT_TYPE_ALREADY_EXISTS",
            details: [
              { field: "uploadedDocumentName", message: "Already exists" },
            ],
          },
          400,
        ),
      );
    }

    const byUploadedTypeId = await getData({
      tableName: "DocumentTypes",
      conditions: { uploadedDocumentTypeId },
    });

    if (byUploadedTypeId?.length > 0) {
      return next(
        new AppError(
          {
            message: "Document type already exists",
            code: "DOCUMENT_TYPE_ALREADY_EXISTS",
            details: [
              { field: "uploadedDocumentTypeId", message: "Already exists" },
            ],
          },
          400,
        ),
      );
    }

    return next();
  } catch (error) {
    return next(
      new AppError(
        {
          message: "Unable to validate document type",
          code: "DOCUMENT_TYPE_CHECK_FAILED",
          details: { error: error?.message },
        },
        500,
      ),
    );
  }
};

module.exports = checkDocumentTypeExists;
