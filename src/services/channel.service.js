const { Op } = require('sequelize');
const { Channel } = require('../models');

async function list({ page = 1, pageSize = 20, q }) {
  page = Number(page) || 1;
  pageSize = Number(pageSize) || 20;

  const where = {};
  if (q) {
    const like = `%${q}%`;
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.iLike]: like } },
        { tiktok_channel_id: { [Op.iLike]: like } },
      ],
    });
  }

  const { rows, count } = await Channel.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['id', 'DESC']],
  });

  return {
    data: rows,
    pagination: { page, pageSize, total: count },
  };
}

function get(id) {
  return Channel.findByPk(id);
}

async function create({ tiktok_channel_id, name }) {
  return Channel.create({ tiktok_channel_id, name });
}

async function update(id, payload) {
  const ch = await Channel.findByPk(id);
  if (!ch) return null;

  await ch.update({
    tiktok_channel_id: payload.tiktok_channel_id ?? ch.tiktok_channel_id,
    name: payload.name ?? ch.name,
  });
  return ch;
}

async function remove(id) {
  const n = await Channel.destroy({ where: { id } });
  return n > 0;
}

module.exports = { list, get, create, update, remove };
