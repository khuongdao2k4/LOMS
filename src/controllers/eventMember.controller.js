const eventMemberService = require("../services/eventMember.service");

async function assign(req, res) {
  try {
    const eventId = req.params.eventId;
    const members = req.body.members || [];
    const result = await eventMemberService.assignMembers(eventId, members);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function remove(req, res) {
  try {
    const { eventId } = req.params;
    const { employee_id, role } = req.body; // or query
    const deleted = await eventMemberService.removeMember(
      eventId,
      employee_id,
      role
    );
    return res.json({ success: true, data: { deleted } });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

module.exports = { assign, remove };
