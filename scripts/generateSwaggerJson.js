const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('../config/swaggerOptions'); // Adjust path as necessary

const specs = swaggerJsdoc(swaggerOptions);
const swaggerJsonPath = path.join(__dirname, '../swagger.json');

fs.writeFileSync(swaggerJsonPath, JSON.stringify(specs, null, 2));

console.log(`Swagger JSON file generated at ${swaggerJsonPath}`); 