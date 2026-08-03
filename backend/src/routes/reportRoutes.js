const express = require("express");
const router = express.Router();
const { getProfitLossReport } = require("../controllers/reportController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

router.get(
  "/pnl",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER", "AUDITOR"),
  getProfitLossReport,
);

module.exports = router;
