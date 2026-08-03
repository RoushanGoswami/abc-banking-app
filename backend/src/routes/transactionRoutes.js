const express = require("express");
const router = express.Router();
const { createTransaction } = require("../controllers/transactionController");
const {
  authenticate,
  authorizeRoles,
  auditLogger,
} = require("../middleware/auth");

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER", "TELLER"),
  auditLogger("CREATE_TRANSACTION", "ACCOUNT"),
  createTransaction,
);

module.exports = router;
