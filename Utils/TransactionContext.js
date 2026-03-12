const { AsyncLocalStorage } = require('async_hooks');

/**
 * AsyncLocalStorage instance to store database connections within an asynchronous execution context.
 * This allows CRUD helpers to automatically access a transaction connection without explicit parameter passing.
 */
const transactionStorage = new AsyncLocalStorage();

module.exports = { transactionStorage };
