const fs = require('fs-extra');
const path = require('path');
const { config } = require('../config/app');

// Ensure directories exist
const ensureDirectories = async () => {
  const uploadDir = path.join(process.cwd(), config.uploadDir);
  
  await fs.ensureDir(uploadDir);
  
  return { uploadDir };
};











module.exports = {
  ensureDirectories
}; 