// src/config/swagger.js
const swaggerUi   = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Livestream Backend API',
      version: '1.0.0',
      description: 'API cho HRM, Auth, Schedule/Events, Sessions...',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ==== Auth ====
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin1' },
            password: { type: 'string', example: 'admin123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            account: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                username: { type: 'string', example: 'admin1' },
                roles: { type: 'array', items: { type: 'string' }, example: ['ADMIN'] },
              },
            },
          },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
        LogoutRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },

        // ==== Employee (ví dụ) ====
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            full_name: { type: 'string' },
            gender: { type: 'string', enum: ['MALE','FEMALE','OTHER'] },
            date_of_birth: { type: 'string', format: 'date' },
            hometown: { type: 'string' },
            address: { type: 'string' },
            cccd: { type: 'string' },
            portrait_url: { type: 'string' },
            join_date: { type: 'string', format: 'date' },
            telegram_id: { type: 'string' },
            account_id: { type: 'integer', nullable: true },
            is_active: { type: 'boolean' },
          },
        },

        // ==== Schedule (weekly) ====
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            channel_id: { type: 'integer', example: 1 },
            weekdays_mask: { type: 'integer', example: 42 },
            start_at: { type: 'string', example: '09:00:00' },
            end_at: { type: 'string', example: '11:00:00' },
            is_active: { type: 'boolean', example: true },
            created_by: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Nơi swagger-jsdoc quét JSDoc để build paths
  apis: ['src/routes/*.js'], 
};

const specs = swaggerJSDoc(options);

module.exports = { swaggerUi, specs };
