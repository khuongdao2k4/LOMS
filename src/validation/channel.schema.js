const Joi = require('joi');

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional(),
  q: Joi.string().allow('', null).optional(),
});

const createBody = Joi.object({
  tiktok_channel_id: Joi.string().trim().max(100).required(),
  name: Joi.string().trim().max(150).required(),
});

const updateBody = Joi.object({
  tiktok_channel_id: Joi.string().trim().max(100).optional(),
  name: Joi.string().trim().max(150).optional(),
}).min(1);

module.exports = {
  listQuery,
  createBody,
  updateBody,
};
