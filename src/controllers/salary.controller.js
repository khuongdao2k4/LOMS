// src/controllers/salary.controller.js
const svc = require("../services/salary.service");

module.exports = {
  // GET /api/v1/salary-configs
  async list(req, res) {
    try {
      const { page, pageSize, q } = req.query;
      const out = await svc.list({ page, pageSize, q });
      return res.json(out);
    } catch (e) {
      console.error("[SALARY/LIST]", e);
      return res.status(500).json({ message: "Internal error" });
    }
  },

  // GET /api/v1/salary-configs/:id
  async get(req, res) {
    try {
      const cfg = await svc.getById(req.params.id);
      if (!cfg) return res.status(404).json({ message: "Not found" });
      return res.json(cfg);
    } catch (e) {
      console.error("[SALARY/GET]", e);
      return res.status(500).json({ message: "Internal error" });
    }
  },

  // GET /api/v1/salary-configs/by-employee/:employee_id
  async getByEmployee(req, res) {
    try {
      const cfg = await svc.getByEmployeeId(req.params.employee_id);
      if (!cfg) return res.status(404).json({ message: "Not found" });
      return res.json(cfg);
    } catch (e) {
      console.error("[SALARY/GET_BY_EMPLOYEE]", e);
      return res.status(500).json({ message: "Internal error" });
    }
  },

  // PATCH /api/v1/salary-configs/:id
  async patch(req, res) {
    try {
      const updated = await svc.updatePartial(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      return res.json(updated);
    } catch (e) {
      console.error("[SALARY/PATCH]", e);
      return res.status(500).json({ message: "Internal error" });
    }
  },

  // DELETE /api/v1/salary-configs/:id
  async remove(req, res) {
    try {
      const ok = await svc.remove(req.params.id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      return res.status(204).end();
    } catch (e) {
      console.error("[SALARY/DELETE]", e);
      return res.status(500).json({ message: "Internal error" });
    }
  },
};
