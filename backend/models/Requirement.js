const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Requirement {
  static async create(requirementData) {
    const {
      receiverId,
      receiverName,
      organizationName,
      title,
      foodType,
      quantity,
      unit,
      urgency,
      description,
      location,
      neededBy,
      servingSize
    } = requirementData;

    const id = uuidv4();
    
    const query = `
      INSERT INTO requirements (
        id, receiver_id, receiver_name, organization_name, title, food_type,
        quantity, unit, urgency, description, location, needed_by, serving_size,
        status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      id, receiverId, receiverName, organizationName, title, foodType,
      quantity, unit, urgency, description, JSON.stringify(location),
      neededBy, servingSize
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByReceiver(receiverId) {
    const query = `
      SELECT * FROM requirements 
      WHERE receiver_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [receiverId]);
    return result.rows;
  }

  static async findActive() {
    const query = `
      SELECT * FROM requirements 
      WHERE status = 'active' 
      ORDER BY urgency DESC, created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id, status, matchedWith = null) {
    const query = `
      UPDATE requirements 
      SET status = $1, matched_with = $2, matched_at = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING *
    `;
    
    const matchedAt = matchedWith ? new Date() : null;
    const values = [status, matchedWith, matchedAt, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM requirements WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM requirements ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAnalytics() {
    const query = `
      SELECT 
        COUNT(*) as total_requirements,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_requirements,
        COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched_requirements,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_requirements,
        SUM(CAST(serving_size AS INTEGER)) as total_people_served
      FROM requirements
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Requirement;