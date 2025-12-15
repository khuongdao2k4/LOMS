"use strict";

const { ScheduleStaff, Employee } = require("../models");

const ROLE_VALUES = ["LIVE", "SUPPORT"];

async function listBySchedule(scheduleId) {
  if (!scheduleId) return [];
  return ScheduleStaff.findAll({
    where: { schedule_id: scheduleId },
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "full_name", "portrait_url"],
      },
    ],
    order: [
      ["is_primary", "DESC"],
      ["role", "ASC"],
      ["priority", "ASC"],
      ["employee_id", "ASC"],
    ],
  });
}

async function replaceForSchedule(scheduleId, staff = []) {
  if (!scheduleId) {
    const err = new Error("schedule_id is required");
    err.status = 400;
    throw err;
  }

  await ScheduleStaff.destroy({ where: { schedule_id: scheduleId } });

  if (!Array.isArray(staff) || staff.length === 0) {
    return [];
  }

  const payload = staff.map((record) => {
    const employeeId = Number(record.employee_id);
    if (!employeeId) {
      const err = new Error("Each staff entry must include employee_id");
      err.status = 400;
      throw err;
    }

    const role = String(record.role || "").toUpperCase();
    if (!ROLE_VALUES.includes(role)) {
      const err = new Error("Each staff entry must include role LIVE or SUPPORT");
      err.status = 400;
      throw err;
    }

    const priority =
      typeof record.priority !== "undefined" && record.priority !== null
        ? Number(record.priority)
        : null;

    return {
      schedule_id: scheduleId,
      employee_id: employeeId,
      role,
      priority,
      is_primary: !!record.is_primary,
    };
  });

  await ScheduleStaff.bulkCreate(payload);
  return listBySchedule(scheduleId);
}

module.exports = { listBySchedule, replaceForSchedule };
