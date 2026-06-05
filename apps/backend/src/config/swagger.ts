/**
 * Bastion Nexus — Swagger / OpenAPI Config
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bastion Nexus API',
      version: '1.0.0',
      description: 'Personal Security Ecosystem — Encrypted Vault, Notes, Wallet & Breach Monitoring',
      contact: {
        name: 'Bastion Nexus',
      },
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token từ /auth/login hoặc /auth/register',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
